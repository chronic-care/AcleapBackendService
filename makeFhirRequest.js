require('dotenv').config();

const express = require('express'); 
const cors = require('cors'); 
const axios = require('axios');
const getAzureADToken = require('./getAzureADToken');

const app = express(); 

// Use CORS middleware with specific configuration to allow requests from any origin
// and to enable credentials and various HTTPS methods
app.use(cors({
    origin: "*", // Allow all origins
    credentials: true, // Allow cookies to be sent with requests
    methods: ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"] // Allowed HTTPS methods
}));
app.use(express.json()); // Parse JSON bodies in requests

// Retrieve the FHIR server URL from environment variables
const fhirServerURL = process.env.FHIR_SERVER_URL;

// Middleware to obtain an Azure AD token and attach it to the request object
app.use(async (req, res, next) => {
    try {
        const accessToken = await getAzureADToken(); 
        req.accessToken = accessToken; 
        next();
    } catch (error) {
        next(error);
    }
});

// Function to make requests to the FHIR server for a specific resource type
const makeFHIRRequest = async (req, resourceType) => {
    const headers = {
        headers: { 'Authorization': `Bearer ${req.accessToken}` },
        params: { '_count': '10000' } // Query parameter to specify number of results
    };
    return axios.get(`${fhirServerURL}/${resourceType}`, headers); // Make GET request
};

// Error handling middleware to handle any errors that occur during request processing
app.use((error, req, res, next) => {
    console.error('Error:', error); 
    if (error.response) {
        res.status(error.response.status).send({ message: 'FHIR Server Error', error: error.response.data });
    } else if (error.request) {
        res.status(500).send({ message: 'No response received from FHIR Server', error: error.message });
    } else {
        res.status(500).send({ message: 'Error processing your request', error: error.message });
    }
});

// Dynamically create route handlers for different FHIR resources
const resources = ['Task', 'Patient', 'ServiceRequest', 'PractitionerRole'];
resources.forEach(resource => {
    app.get(`/${resource}`, async (req, res, next) => {
        try {
            const response = await makeFHIRRequest(req, resource);
            res.status(200).json(response.data.entry);
        } catch (error) {
            next(error); 
        }
    });
});

// Function to search for patients by last name and date of birth
const searchPatients = async (accessToken, lastName, dob) => {
    const headers = {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { 
            'family': lastName,
            'birthdate': dob
        }
    };
    return axios.get(`${fhirServerURL}/Patient`, headers);
};

// Route handler for searching patients by last name and date of birth
app.get('/search/Patient', async (req, res, next) => {
    try {
        const accessToken = req.accessToken; // Get the access token from the request
        const { lastName, dob } = req.query; // Get last name and dob from query parameters

        const response = await searchPatients(accessToken, lastName, dob); // Call the function to search for patients
        res.status(200).json(response.data.entry);
    } catch (error) {
        next(error);
    }
});

function createPatientObject(
    firstName,
    lastName,
    dateOfBirth,
    gender,
    race,
    ethnicity,
    sexAtBirth,
    genderIdentity,
    sexualOrientation,
    language,
    phoneNumber,
    email,
    address1,
    address2,
    city,
    state,
    zipcode,
    managingOrganization
) {
    const patient = {
        "resourceType": "Patient",
        "active": true,
        "name": [
            {
                "use": "official",
                "family": lastName,
                "given": [firstName]
            }
        ],
        "gender": gender,
        "birthDate": dateOfBirth,
        "telecom": [
            {
                "system": "phone",
                "value": phoneNumber
            },
            {
                "system": "email",
                "value": email
            }
        ],
        "address": [
            {
                "use": "home",
                "line": [address1, address2],
                "city": city,
                "state": state,
                "postalCode": zipcode
            }
        ],
        "communication": [
            {
                "language": {
                    "coding": [
                        {
                            "system": "urn:ietf:bcp:47",
                            "display":language
                        }
                    ]
                },
                "preferred": true
            }
        ],
        "extension": [
            {
                "url": "http://hl7.org/fhir/StructureDefinition/us-core-race",
                "extension": [
                    {
                        "url": "ombCategory",
                        "valueCoding": {
                            "system": "urn:oid:2.16.840.1.113883.6.238",
                            "code": race
                        }
                    }
                ]
            },
            {
                "url": "http://hl7.org/fhir/StructureDefinition/us-core-ethnicity",
                "extension": [
                    {
                        "url": "ombCategory",
                        "valueCoding": {
                            "system": "urn:oid:2.16.840.1.113883.6.238",
                            "code": ethnicity
                        }
                    }
                ]
            },
            {
                "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
                "valueCode": sexAtBirth
            }
        ],
        "managingOrganization": {
            "reference": managingOrganization
        }
    };

    // Optional fields
    if (genderIdentity) {
        patient.extension.push({
            "url": "https://example.com/fhir/extensions/genderIdentity",
            "valueString": genderIdentity
        });
    }

    if (sexualOrientation) {
        patient.extension.push({
            "url": "https://example.com/fhir/extensions/sexualOrientation",
            "valueString": sexualOrientation
        });
    }

    return patient;
}

// POST endpoint for creating a patient
app.post('/createPatient', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            race,
            ethnicity,
            sexAtBirth,
            genderIdentity,
            sexualOrientation,
            language,
            phoneNumber,
            email,
            address1,
            address2,
            city,
            state,
            zipcode,
            managingOrganization
        } = req.body;

        const patient = createPatientObject(
            firstName,
            lastName,
            dateOfBirth,
            gender,
            race,
            ethnicity,
            sexAtBirth,
            genderIdentity,
            sexualOrientation,
            language,
            phoneNumber,
            email,
            address1,
            address2,
            city,
            state,
            zipcode,
            managingOrganization
        );

        const fhirServerURL =  process.env.FHIR_SERVER_URL;
        const accessToken = await getAzureADToken();
        const response = await axios.post(`${fhirServerURL}/Patient`, patient, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        res.status(201).json(response.data);
    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Route handler for PUT requests on the Task resource
app.post('/update/Task/:taskId', async (req, res, next) => {
    try {
        const {taskId} = req.params; 
        const updateData = req.body; 
        const response = await updateTask(taskId, updateData); // Update the Task in the FHIR server
        
        // Respond with the updated Task data
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

async function updateTask(taskId, patchBody) {
    try {
      // Retrieve the FHIR server URL from environment variables
      const fhirServerURL = process.env.FHIR_SERVER_URL;
      const taskUrl = `${fhirServerURL}/Task/${taskId}`;
      const accessToken = await getAzureADToken();
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json-patch+json'
      };

      // Send the PATCH request to update the Task
      await axios.patch(taskUrl, JSON.stringify(patchBody), {headers});

    } catch (error) {
      console.error('Failed to update Task', error.response ? error.response.data : error.message);
      throw new Error('Error updating Task: ' + (error.response ? error.response.data : error.message));
    }
}

// Simple route handler for '/health' to confirm the service is running
app.get('/health', (req, res) => {
    res.status(200).json({ "message": "Backend Service is healthy" });
});

// Start the server on a specified port, defaulting to 3000 if not specified
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`); 
});
