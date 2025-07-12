const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

router.post('/gn-division-search', async (req, res) => {
  try {
    const { search } = req.body;
    // Removed debug log: Proxy received search
    // Only allow search if at least 3 characters and no numbers
    if (!search || search.length < 3 || /\d/.test(search)) {
      return res.json([]);
    }
    const params = new URLSearchParams();
    params.append('gensearch', search);

    const response = await axios.post(
      'http://moha.gov.lk:8090/lifecode/search',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          'Referer': 'http://moha.gov.lk:8090/lifecode/search',
        }
      }
    );

    // Removed debug log: HTML response

    const $ = cheerio.load(response.data);
    const results = [];
    // Try a more general selector in case the class changes
    $('table tbody tr').each((i, row) => {
      const tds = $(row).find('td');
      if (tds.length >= 4) {
        // Split the Sinhala Name column if it contains all three languages
        const nameCell = $(tds[3]).text().trim();
        let sinhalaName = '', tamilName = '', englishName = '';
        const nameParts = nameCell.split('/');
        if (nameParts.length === 3) {
          sinhalaName = nameParts[0].trim();
          tamilName = nameParts[1].trim();
          englishName = nameParts[2].trim();
        } else {
          sinhalaName = nameCell;
        }
        const code = $(tds[1]).text().trim();
        // Only include if code has at least 3 digits
        if (/\d{3,}/.test(code)) {
          results.push({
            type: $(tds[0]).text().trim(),
            code,
            locationCode: $(tds[2]).text().trim(),
            sinhalaName,
            tamilName,
            englishName,
          });
        }
      }
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', details: error.message });
  }
});

module.exports = router;