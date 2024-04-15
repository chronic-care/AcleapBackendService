require('dotenv').config();

const express = require('express'); 
const cors = require('cors'); 
const axios = require('axios'); 

const app = express();
app.use(cors()); 

//Asynchronous function to retrieve an Azure AD token 
async function getAzureADToken() {

    // Extracting necessary configuration details from environment variables for the token request
    const tenantId = process.env.TENANT_ID; 
    const clientId = process.env.CLIENT_ID; 
    const clientSecret = process.env.CLIENT_SECRET;
    const scope = process.env.SCOPE;
    const tokenUrl = process.env.TOKEN_URL;

    // Prepare the request data using URLSearchParams, which ensures proper encoding
    const tokenRequestData = new URLSearchParams({
        client_id: clientId, 
        scope: scope, 
        client_secret: clientSecret, 
        grant_type: 'client_credentials', 
    });

    try {
        // Attempt to post the token request to the Azure AD token endpoint
        const tokenResponse = await axios.post(tokenUrl, tokenRequestData.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return tokenResponse.data.access_token;
    } catch (error) {
        console.error(`Error obtaining token from Azure AD: ${error.response ? error.response.data : error.message}`);
        throw new Error('Failed to obtain access token from Azure AD');
    }
}

module.exports = getAzureADToken;
