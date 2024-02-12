require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());


async function getAzureADToken() {
    // Retrieve configuration from environment variables
    const tenantId = process.env.tenant_Id;
    const clientId = process.env.client_Id;
    const clientSecret = process.env.client_Secret;
    const scope = process.env.ADscope;
    
    // Token URL constructed with the tenant ID
    const tokenUrl = process.env.token_Url;
     // Set up the POST request body for the token request
    const tokenRequestData = new URLSearchParams();
    tokenRequestData.append('client_id', clientId);
    tokenRequestData.append('scope', scope);
    tokenRequestData.append('client_secret', clientSecret);
    tokenRequestData.append('grant_type', 'client_credentials');
    
    try {
         // Make the HTTP request to get the access token
        const tokenResponse = await axios.post(tokenUrl, tokenRequestData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        // Return the access token from the response
        return tokenResponse.data.access_token;
    } catch (error) {
        console.error('Error obtaining token from Azure AD:', error);
        throw new Error('Failed to obtain access token');
    }
}

module.exports = getAzureADToken;

