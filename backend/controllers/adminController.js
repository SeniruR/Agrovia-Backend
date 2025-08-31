
const { pool } = require('../config/database');

// Helper to convert Buffer to data URL
function bufferToDataUrl(buffer, mime) {
  if (!buffer) return null;
  try {
    const base64 = buffer.toString('base64');
    return `data:${mime || 'image/jpeg'};base64,${base64}`;
  } catch (e) {
    return null;
  }
}

// Get all shops and their items for admin
const getAllShopsWithItems = async (req, res) => {
  try {
    // Get all shops with owner details
    const [shops] = await pool.execute(`
      SELECT sd.*, u.full_name AS owner_name, u.email AS owner_email, u.phone_number AS owner_contact, u.address AS owner_address
      FROM shop_details sd
      LEFT JOIN users u ON sd.user_id = u.id
    `);
    // Get all products with inventory, category and images
    const [items] = await pool.execute(`
      SELECT 
        p.*, 
        inv.unit_type, inv.unit_price, inv.quantity, inv.is_available,
        pc.name AS category_name,
        pi.id AS product_image_id, pi.image AS product_image_blob, pi.image_mime AS product_image_mime,
        p.image AS primary_image_blob, p.image_mime AS primary_image_mime
      FROM products p
      LEFT JOIN product_inventory inv ON inv.product_id = p.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      ORDER BY p.id DESC
    `);

    // Map items to their shops, ensuring required fields
    const shopMap = {};
    shops.forEach(shop => {
      shop.items = [];
      // Map to actual column names and include owner details
      shop.shopName = typeof shop.shop_name === 'string' ? shop.shop_name : '';
      shop.owner = typeof shop.owner_name === 'string' ? shop.owner_name : '';
      shop.ownerEmail = typeof shop.owner_email === 'string' ? shop.owner_email : '';
      shop.ownerContact = typeof shop.owner_contact === 'string' ? shop.owner_contact : '';
      shop.ownerAddress = typeof shop.owner_address === 'string' ? shop.owner_address : '';
      shop.city = typeof shop.shop_address === 'string' ? shop.shop_address : '';
      shop.phone = typeof shop.shop_phone_number === 'string' ? shop.shop_phone_number : '';
  // suspended is derived from `is_active` column: 0 => suspended
  // Some DB layers may return strings, numbers, or booleans; normalize safely
  shop.suspended = (shop.is_active === 0 || shop.is_active === '0' || shop.is_active === false) ? true : false;
      // Ensure frontend key exists
      shop.shopId = shop.id;
      shopMap[shop.id] = shop;
    });

    // Group product rows by product id to collect images
    const productMap = new Map();
    for (const row of items) {
      const pid = row.id; // product id
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          itemId: pid,
          shopId: row.shop_id,
          name: typeof row.product_name === 'string' ? row.product_name : (row.name || ''),
          description: typeof row.description === 'string' ? row.description : (row.product_description || ''),
          price: row.unit_price !== undefined ? row.unit_price : (row.price || 0),
          unit: row.unit_type || row.unit || '',
          available: row.is_available === 1 || Boolean(row.is_available),
          category: row.category_name || row.category || '',
          suspended: row.suspended === 1 || Boolean(row.suspended),
          images: []
        });

        // primary image on product table
        if (row.primary_image_blob) {
          const url = bufferToDataUrl(row.primary_image_blob, row.primary_image_mime);
          if (url) productMap.get(pid).images.push(url);
        }
      }

      // additional product_images rows
      if (row.product_image_blob) {
        const url = bufferToDataUrl(row.product_image_blob, row.product_image_mime);
        if (url) {
          const arr = productMap.get(pid).images;
          if (!arr.includes(url)) arr.push(url);
        }
      }
    }

    // Attach normalized products to their shops
    for (const product of productMap.values()) {
      if (shopMap[product.shopId]) {
        shopMap[product.shopId].items.push(product);
      }
    }

    // Attach latest suspension info (reason/detail) and affected items per shop if present
    const shopIds = Object.keys(shopMap).map(id => Number(id));
    if (shopIds.length > 0) {
      try {
        // Get the latest 'suspend' record per shop (by max id)
        const [suspRows] = await pool.query(
          `SELECT ss.* FROM shop_suspensions ss
           JOIN (
             SELECT shop_id, MAX(id) AS max_id FROM shop_suspensions WHERE action = 'suspend' AND shop_id IN (?) GROUP BY shop_id
           ) mx ON mx.shop_id = ss.shop_id AND mx.max_id = ss.id`,
          [shopIds]
        );

        if (suspRows && suspRows.length > 0) {
          const suspensionIds = suspRows.map(s => s.id);
          // Fetch suspension items and attach product metadata
          const [suspItemRows] = await pool.query(
            `SELECT ssi.suspension_id, p.id AS id, p.product_name, pc.name AS category, inv.unit_price AS price
             FROM shop_suspension_items ssi
             JOIN products p ON p.id = ssi.product_id
             LEFT JOIN product_categories pc ON p.category_id = pc.id
             LEFT JOIN product_inventory inv ON inv.product_id = p.id
             WHERE ssi.suspension_id IN (?)`,
            [suspensionIds]
          );

          // Group items by suspension_id
          const itemsBySusp = {};
          for (const r of suspItemRows || []) {
            itemsBySusp[r.suspension_id] = itemsBySusp[r.suspension_id] || [];
            itemsBySusp[r.suspension_id].push({ id: r.id, product_name: r.product_name, category: r.category, price: r.price });
          }

          // Attach to corresponding shop objects
          for (const ss of suspRows) {
            const shop = shopMap[ss.shop_id];
            if (!shop) continue;
            shop.suspension_reason = ss.reason_code || null;
            shop.suspension_detail = ss.reason_detail || null;
            shop.suspension_id = ss.id;
            shop.suspension_items = itemsBySusp[ss.id] || [];
          }
        }
      } catch (e) {
        // Non-fatal: log and continue returning shops without suspension details
        console.error('Error fetching suspension details for shops:', e);
      }
    }

    res.json(Object.values(shopMap));
  } catch (error) {
    console.error('Error fetching shops and items:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Set shop active status (is_active = 1 active, 0 inactive)
const setShopActiveStatus = async (req, res) => {
  const shopId = req.params.id;
  const { is_active, reason_code, reason_detail, item_ids, created_by } = req.body;
  if (typeof is_active === 'undefined') return res.status(400).json({ error: 'is_active is required' });

  const numeric = Number(is_active) === 1 ? 1 : 0;
  const action = numeric === 1 ? 'activate' : 'suspend';

  // when suspending, reason_code is required
  if (action === 'suspend' && !reason_code) return res.status(400).json({ error: 'reason_code is required when suspending' });
  // if item_issue, item_ids must be an array with at least one id
  if (action === 'suspend' && reason_code === 'item_issue') {
    if (!Array.isArray(item_ids) || item_ids.length === 0) return res.status(400).json({ error: 'item_ids required for item_issue' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // ensure shop exists
    const [shopRows] = await conn.execute('SELECT * FROM shop_details WHERE id = ?', [shopId]);
    if (!shopRows || shopRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Shop not found' });
    }

    let suspensionId = null;
    let deletedSuspensionsCount = 0;

    if (action === 'suspend') {
      // Insert a suspension record
      const [ins] = await conn.execute(
        'INSERT INTO shop_suspensions (shop_id, action, reason_code, reason_detail, created_by) VALUES (?, ?, ?, ?, ?)',
        [shopId, action, reason_code || null, reason_detail || null, created_by || null]
      );
      suspensionId = ins.insertId;

      // If items provided, validate they belong to this shop and insert relations
      if (Array.isArray(item_ids) && item_ids.length > 0) {
        // validate
        const [validRows] = await conn.query('SELECT id FROM products WHERE id IN (?) AND shop_id = ?', [item_ids, shopId]);
        const validIds = validRows.map(r => r.id);
        const invalid = item_ids.filter(id => !validIds.includes(id));
        if (invalid.length > 0) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ error: 'Some item_ids are invalid or do not belong to the shop', invalid });
        }

        // bulk insert into shop_suspension_items
        const values = item_ids.map(pid => [suspensionId, pid, null]);
        await conn.query('INSERT INTO shop_suspension_items (suspension_id, product_id, note) VALUES ?', [values]);
      }
    } else {
      // action === 'activate' -> remove prior suspension records for this shop
      // If created_by provided, delete only suspensions created by that admin; otherwise delete all suspend records for the shop
      if (created_by) {
        // delete related items first for suspensions by this admin
        await conn.execute(
          `DELETE ssi FROM shop_suspension_items ssi
           JOIN shop_suspensions ss ON ssi.suspension_id = ss.id
           WHERE ss.shop_id = ? AND ss.action = 'suspend' AND ss.created_by = ?`,
          [shopId, created_by]
        );
        const [delRes] = await conn.execute('DELETE FROM shop_suspensions WHERE shop_id = ? AND action = ? AND created_by = ?', [shopId, 'suspend', created_by]);
        deletedSuspensionsCount = delRes.affectedRows || 0;
      } else {
        // delete all suspensions for this shop
        await conn.execute(
          `DELETE ssi FROM shop_suspension_items ssi
           JOIN shop_suspensions ss ON ssi.suspension_id = ss.id
           WHERE ss.shop_id = ? AND ss.action = 'suspend'`,
          [shopId]
        );
        const [delRes] = await conn.execute('DELETE FROM shop_suspensions WHERE shop_id = ? AND action = ?', [shopId, 'suspend']);
        deletedSuspensionsCount = delRes.affectedRows || 0;
      }
    }

    // Update shop active flag
    const [upd] = await conn.execute('UPDATE shop_details SET is_active = ? WHERE id = ?', [numeric, shopId]);

  await conn.commit();

    // Return normalized shop object (with owner fields and suspended boolean)
    const [rows] = await pool.execute(
      `SELECT sd.*, u.full_name AS owner_name, u.email AS owner_email, u.phone_number AS owner_contact, u.address AS owner_address
       FROM shop_details sd
       LEFT JOIN users u ON sd.user_id = u.id
       WHERE sd.id = ?`,
      [shopId]
    );
    const shopRow = rows[0];
    const normalized = {
      shopId: shopRow.id,
      shopName: typeof shopRow.shop_name === 'string' ? shopRow.shop_name : '',
      owner: typeof shopRow.owner_name === 'string' ? shopRow.owner_name : '',
      ownerEmail: typeof shopRow.owner_email === 'string' ? shopRow.owner_email : '',
      ownerContact: typeof shopRow.owner_contact === 'string' ? shopRow.owner_contact : '',
      ownerAddress: typeof shopRow.owner_address === 'string' ? shopRow.owner_address : '',
      city: typeof shopRow.shop_address === 'string' ? shopRow.shop_address : '',
      phone: typeof shopRow.shop_phone_number === 'string' ? shopRow.shop_phone_number : '',
      suspended: (shopRow.is_active === 0 || shopRow.is_active === '0' || shopRow.is_active === false) ? true : false
    };

  return res.json({ shop: normalized, suspension: suspensionId ? { id: suspensionId, action, reason_code: reason_code || null, reason_detail: reason_detail || null } : null, deleted_suspensions: deletedSuspensionsCount });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (e) { /* ignore */ }
      try { conn.release(); } catch (e) { /* ignore */ }
    }
    console.error('Error updating shop active status with suspension flow:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllShopsWithItems, setShopActiveStatus };
