# Truth Sentinel

Build a modern, responsive AI-powered web application called "TruthGuard AI – Fake News Detection Using Naïve Bayes Classification".



Tech Stack:

- Frontend: React.js (Vite), Tailwind CSS, React Router, Chart.js

- Backend: Python Flask + Flask-CORS

- Machine Learning: Scikit-learn, Naïve Bayes (MultinomialNB), TF-IDF Vectorizer, NLTK

- Database: SQLite

- Authentication: Firebase Email & Google Login

- AI: Google Gemini API

- OCR: Tesseract OCR



Project Features:

1. Professional Landing Page with Hero Section, About, Features, How It Works, Team, Contact and Footer.

2. Login, Register and Forgot Password using Firebase Authentication.

3. Dashboard showing:

   - Total Predictions

   - Fake News Count

   - Real News Count

   - Accuracy

   - Pie Chart

   - Bar Chart

   - Recent Predictions

4. Fake News Detection Page where users can:

   - Type news text

   - Paste article

   - Upload .txt file

   - Upload image (OCR)

5. Machine Learning Pipeline:

   - Text Cleaning

   - Lowercase Conversion

   - Remove Punctuation

   - Remove Stopwords

   - TF-IDF Vectorization

   - Naïve Bayes Classification

   - Predict Fake or Real

   - Show Confidence Score

6. OCR:

   - Extract text from uploaded image using Tesseract

   - Send extracted text to ML model

7. Gemini AI Features:

   - Explain why the news is Fake or Real

   - Summarize the article

   - Highlight suspicious claims

   - Provide fact-checking tips

   - AI Chatbot to answer questions about fake news

8. Prediction History:

   - Store Date, News, Prediction, Confidence

   - Search

   - Filter

   - Delete

   - Export CSV

9. User Profile:

   - Update Profile

   - Dark/Light Theme

   - Language Settings

10. Multi-language Support:

   - English

   - Hindi

11. Admin Panel:

   - View Users

   - View Prediction Analytics

   - Retrain Naïve Bayes Model

12. Responsive UI with:

   - Blue & White Theme

   - Glassmorphism Cards

   - Smooth Animations

   - Loading Spinner

   - Toast Notifications



Dataset:

Use Fake.csv and True.csv from the Kaggle Fake and Real News Dataset.



Folder Structure:

frontend/

backend/

dataset/

model/

ocr/

database/

uploads/



Important:

- Use Naïve Bayes as the primary machine learning algorithm.

- Use TF-IDF for feature extraction.

- Gemini API should only explain the prediction, summarize the news, and provide fact-checking suggestions.

- Generate clean, modular, production-ready code with comments.

- Include README.md, requirements.txt, API documentation, and installation steps.

- The project should be beginner-friendly, suitable for an AIML internship, and ready for deployment.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/512c0d1c-b3e0-4247-a78a-4f75aa170d6f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
