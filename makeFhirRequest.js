// Load environment variables from a .env file into process.env
require('dotenv').config();

// Import necessary modules
const express = require('express'); // Express framework for building web applications
const cors = require('cors'); // CORS middleware to enable Cross-Origin Resource Sharing
const axios = require('axios'); // HTTPS client for making requests to APIs
const getAzureADToken = require('./getAzureADToken'); // Custom function to obtain Azure AD token


const app = express(); // Initialize an Express application

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
// for use in subsequent requests
app.use(async (req, res, next) => {
    try {
        const accessToken = await getAzureADToken(); // Obtain token
        req.accessToken = accessToken; // Attach token to request object
        console.log('accessToken', accessToken);
        next(); // Proceed to next middleware or route handler
    } catch (error) {
        next(error); // Pass error to error handling middleware
    }
});

// Function to make requests to the FHIR server for a specific resource type
// using the Azure AD token for authentication
const makeFHIRRequest = async (req, resourceType) => {
    const headers = {
        headers: { 'Authorization': `Bearer ${req.accessToken}` }, // Authorization header
        params: { '_count': '10000' } // Query parameter to specify number of results
    };
    return axios.get(`${fhirServerURL}/${resourceType}`, headers); // Make GET request
};

// Error handling middleware to handle any errors that occur during request processing
app.use((error, req, res, next) => {
    console.error('Error:', error); // Log error
    if (error.response) {
        // If error response is available from the server, send it back to the client
        res.status(error.response.status).send({ message: 'FHIR Server Error', error: error.response.data });
    } else if (error.request) {
        // If request was made but no response was received
        res.status(500).send({ message: 'No response received from FHIR Server', error: error.message });
    } else {
        // For other types of errors
        res.status(500).send({ message: 'Error processing your request', error: error.message });
    }
});

// Dynamically create route handlers for different FHIR resources
const resources = ['Task', 'Patient', 'ServiceRequest', 'PractitionerRole'];
resources.forEach(resource => {
    app.get(`/${resource}`, async (req, res, next) => {
        try {
            const response = await makeFHIRRequest(req, resource); // Make FHIR request
            res.status(200).json(response.data.entry); // Send back the data
        } catch (error) {
            next(error); // Pass error to error handling middleware
        }
    });
});

// Route handler for PUT requests on the Task resource
app.post('/update/Task/:taskId', async (req, res, next) => {
    try {
        // console.log("req.body-=-==-=-=-=",req.body)
        const {taskId} = req.params;
        // const { taskId } = req.params; // Extract the Task ID from the URL parameters
        const updateData = req.body; // The JSON body contains the fields to be updated

        console.log("req.body-=-==-=-=-=",req.body)
        console.log("taskID-=-==-=-=-=",taskId)


        const response = await updateTask(taskId, req.body); // Update the Task in the FHIR server
    // console.log("taskId-------------",taskId)
        // Perform the PUT request to update the Task, accessToken is now handled within updateFHIRResource
        // const response = await updateFHIRResource('Task', taskId,updateData);
        console.log("response",response)

        // Respond with the updated Task data
        res.status(200).json(response);
    } catch (error) {
        next(error); // Pass any errors to the error handling middleware
    }
});

async function updateTask(taskId, patchBody) {
    try {
      // Retrieve the FHIR server URL from environment variables
      const fhirServerURL = process.env.FHIR_SERVER_URL;
      const taskUrl = `${fhirServerURL}/Task/${taskId}`;
  
      // Retrieve the Azure AD access token
      const accessToken = await getAzureADToken();
  
      // Prepare headers
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json-patch+json'
      };
  
      // Send the PATCH request to update the Task
      await axios.patch(taskUrl, JSON.stringify(patchBody), {headers});
  
      console.log('Task updated successfully with new status, owner, and note');
    } catch (error) {
      // Axios wraps the response error in the 'response' object
      console.error('Failed to update Task', error.response ? error.response.data : error.message);
      throw new Error('Error updating Task: ' + (error.response ? error.response.data : error.message));
    }
  }

// async function updateTask(taskId,patchBody) {
//     // Retrieve the FHIR server URL from environment variables
//      const fhirServerURL = process.env.FHIR_SERVER_URL;
//      const taskUrl = `${fhirServerURL}/Task/${taskId}`;
   
//        // Retrieve the Azure AD access token
//        const accessToken = await getAzureADToken();
   
//      // Send the PATCH request to update the Task
//      const patchResponse = await fetch(taskUrl, {
//        method: 'PATCH',
//        headers: {
//          'Authorization': `Bearer ${accessToken}`,
//          'Content-Type': 'application/json-patch+json'
//        },
//        body: JSON.stringify(patchBody)
//      });
   
//      if (!patchResponse.ok) {
//        throw new Error('Failed to update Task');
//      }
   
//      console.log('Task updated successfully with new status, owner, and note');
//    }
   

// app.post('/updateTask/:taskId', async (req, res) => {
//     try {
//       const { taskId, newStatus, newOwnerReference, newNoteText } = req.params;

//       console.log("taskID-=-==-=-=-=",taskId);
//       console.log("newStatus-=-==-=-=-=",newStatus);
  
//       // Call your function with the parameters received from the frontend
//     //   await updateTaskConditionally(taskId, newStatus, newOwnerReference, newNoteText);
  
//       res.send({ message: 'Task updated successfully' });
//     } catch (error) {
//       console.error(error);
//       res.status(500).send({ error: error.message });
//     }
//   });

// Simple route handler for '/ping' to confirm the service is running
app.get('/ping', (req, res) => {
    res.status(200).json({ "message": "Get method confirmation" });
});

// Start the server on a specified port, defaulting to 3000 if not specified
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`); // Log server start
});
