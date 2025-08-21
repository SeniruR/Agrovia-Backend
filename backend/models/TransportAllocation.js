const { pool } = require('../config/database');

class TransportAllocation{
    //create a new transport allocation
    static async create(TransportAllocationData){
        const {
            cart_item_id,
            transport_id,
          
            vehicle_type,
            vehicle_number,
            phone_number,
            base_rate,
            per_km_rate,
            calculated_distance,
            transport_cost,
            district,
            created_at
        } = TransportAllocationData;
        const transportAllocationQuery = `
            INSERT INTO cart_transports (
                cart_item_id,
                transport_id,
                
                vehicle_type,
                vehicle_number,
                phone_number,
                base_rate,
                per_km_rate,
                calculated_distance,
                transport_cost,
                district,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            cart_item_id,
            transport_id,
          
            vehicle_type,
            vehicle_number,
            phone_number,
            base_rate,
            per_km_rate,
            calculated_distance,
            transport_cost,
            district,
            created_at
        ];
    // Debug: log the query and values so we can inspect what is being inserted
    console.log('TransportAllocation.query ->', transportAllocationQuery.trim());
    console.log('TransportAllocation.values ->', values);

    return pool.query(transportAllocationQuery, values);
    }

    // find allocations by cart item id
    static async findByCartItem(cart_item_id){
        const query = `SELECT * FROM cart_transports WHERE cart_item_id = ? ORDER BY created_at DESC`;
        const [rows] = await pool.query(query, [cart_item_id]);
        return rows;
    }

    // return all transport allocations
    static async findAll(){
        const query = `SELECT * FROM cart_transports ORDER BY created_at DESC`;
        const [rows] = await pool.query(query);
        return rows;
    }

    
}


module.exports = TransportAllocation;