
# Object Detection Web Application

This is a web application for object detection, specifically designed for detecting Russian tanks in images and videos. It utilizes object detection algorithms to identify and highlight Russian tanks within the provided media content.

## Features

- Detect Russian tanks in both images and videos
- Display detected tanks with additional information
- Provide insights about the weaknesses of detected tanks using AI-generated content
- Store detection results in a MongoDB database for future reference

## Technologies Used

- Frontend:
  - HTML, CSS, JavaScript
  - Bootstrap for responsive design
  - jQuery for DOM manipulation
  
- Backend:
  - Node.js with Express.js for server-side logic
  - MongoDB for storing detection results
  
- Object Detection:
  - Custom Python scripts using TensorFlow for object detection
  - Google Generative AI for generating tank-related content
  
## Getting Started

To run the application locally, follow these steps:

1. Clone this repository to your local machine.
2. Install the required dependencies by running `npm install`.
3. Set up MongoDB and ensure it's running on your system.
4. Configure environment variables as needed (API keys, database URI, etc.).
5. Start the server by running `npm start`.
6. Access the application in your browser at `http://localhost:<PORT>`.

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please follow these steps:

1. Fork this repository.
2. Create a new branch (`git checkout -b feature/<feature-name>`).
3. Make your changes and commit them (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/<feature-name>`).
5. Create a new pull request.

Download the weights here:
https://drive.google.com/file/d/1XYfzttS9SoayM9GVGCf1DaZ-BdPC5L8j/view?usp=sharing
