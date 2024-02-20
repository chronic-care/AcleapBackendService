// Load and set environment variables from a .env file to process.env, making them available throughout the application
require('dotenv').config();

const express = require('express'); // Import the Express framework for creating server-side applications
const cors = require('cors'); // Import the CORS middleware to enable Cross-Origin Resource Sharing
const axios = require('axios'); // Import Axios, a promise-based HTTPS client for making requests to external services

const app = express(); // Initialize a new Express application
app.use(cors()); // Use the CORS middleware with default settings to allow all cross-origin requests

// Define an asynchronous function to retrieve an Azure AD token using client credentials flow
async function getAzureADToken() {

    // Extract necessary configuration details from environment variables for the token request
    const tenantId = process.env.TENANT_ID; // Azure AD tenant ID
    const clientId = process.env.CLIENT_ID; // Application (client) ID registered in Azure AD
    const clientSecret = process.env.CLIENT_SECRET; // Secret generated for the Azure AD application
    const scope = process.env.SCOPE; // The scope of the access request
    const tokenUrl = process.env.TOKEN_URL; // URL to Azure AD token endpoint

    // Prepare the request data using URLSearchParams, which ensures proper encoding
    const tokenRequestData = new URLSearchParams({
        client_id: clientId, // The client ID of the Azure AD application
        scope: scope, // Scope of the access request
        client_secret: clientSecret, // Application secret
        grant_type: 'client_credentials', // Specifies that the client credentials grant type is used
    });

    try {
        // Attempt to post the token request to the Azure AD token endpoint
        const tokenResponse = await axios.post(tokenUrl, tokenRequestData.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' } // Set content type header for URL-encoded form data
        });

        // Successfully retrieved the token, return it
        return tokenResponse.data.access_token;
    } catch (error) {
        // Log any error encountered during the token request and throw a new error to indicate token retrieval failure
        console.error(`Error obtaining token from Azure AD: ${error.response ? error.response.data : error.message}`);
        throw new Error('Failed to obtain access token from Azure AD');
    }
}

module.exports = getAzureADToken; // Export the function for use in other parts of the application
