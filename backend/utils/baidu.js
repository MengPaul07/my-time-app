const axios = require('axios');
const qs = require('querystring');
require('dotenv').config();

const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

let cachedAccessToken = null;
let tokenExpiresAt = 0;

const getAccessToken = async () => {
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
        throw new Error('Please set BAIDU_API_KEY and BAIDU_SECRET_KEY in .env');
    }

    // Reuse token if valid
    if (cachedAccessToken && Date.now() < tokenExpiresAt) {
        return cachedAccessToken;
    }

    try {
        const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
        const response = await axios.post(url);
        
        if (response.data.access_token) {
            cachedAccessToken = response.data.access_token;
            // Token usually valid for 30 days, set refresh earlier (e.g. 29 days)
            tokenExpiresAt = Date.now() + (response.data.expires_in - 86400) * 1000; 
            return cachedAccessToken;
        } else {
            throw new Error('Failed to get Access Token: ' + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error('Baidu Token Error:', error);
        throw error;
    }
};

const recognizeImage = async (base64Img) => {
    try {
        const accessToken = await getAccessToken();
        const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general?access_token=${accessToken}`;
        
        const response = await axios.post(url, qs.stringify({
            image: base64Img,
            language_type: 'CHN_ENG'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data.error_code) {
            throw new Error(`Baidu OCR Error: ${response.data.error_msg}`);
        }

        return response.data;

    } catch (error) {
        console.error('Baidu OCR Request Error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = { recognizeImage };
