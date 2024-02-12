require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const getAzureADToken = require('./getAzureADToken');

const app = express();

// // Whitelist for allowed origins
const whitelist = ['http://localhost:8000', 'http://localhost:8000/acleap-referral'];

// Configure CORS options
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // To allow cookies and sessions
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

// Apply CORS with the specified options
app.use(cors(corsOptions));

// Use express.json() to parse JSON payloads
app.use(express.json());

async function makeFHIRRequest() {
    try {
        const fhirServerURL = process.env.fhirServer_URL; // Ensure your environment variable is correctly named
        const accessToken = await getAzureADToken();

        console.log("fhirServerURL", fhirServerURL);
        console.log("accessToken", accessToken);

        const response = await axios.get(`${fhirServerURL}/Task`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log("Patient Data from the Azure Health data FHIR services:", response.data);
        return response.data.entry;
    } catch (error) {
        console.error('Failed to fetch patient data:', error.response?.data || error.message);
        throw error; // Rethrow the error to handle it in the calling function
    }
}

app.get('/Task', async(req, res) => {
    try {
        const response = await makeFHIRRequest(); // Added await here
        res.status(200).json(response); // Corrected JSON response format
    } catch (error) {
        console.error('Error:', error);
        console.log("Error details:", JSON.stringify(error, null, 2));
        if (error.response) {
            res.status(error.response.status).send({ message: 'FHIR Server Error', error: error.response.data });
        } else if (error.request) {
            res.status(500).send({ message: 'No response received from FHIR Server', error: error.message });
        } else {
            res.status(500).send({ message: 'Error processing your request', error: error.message });
        }
    }
});

app.get('/ping', (req, res) => {
    res.status(200).json({ "message": "Get method confirmation" }); // Corrected key to lowercase for consistency
});

// Start the server on the specified port or default to 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
