"use client";
import { useState, useEffect, useRef } from 'react';
import WebPageRecorder from '@/hlper/webpageRecorder'; // Assuming the WebPageRecorder class is in the same folder

const questions = [
  {
    question: "Which of the following brands have you purchased from in the last 6 months?",
    options: ["Apple", "Samsung", "Nike", "Adidas"],
    color: "bg-blue-500",
  },
  {
    question: "How often do you shop online?",
    options: ["Once a week", "Once a month", "A few times a year", "Rarely"],
    color: "bg-green-500",
  },
  {
    question: "Which factor is most important to you when making a purchase?",
    options: ["Price", "Brand reputation", "Product quality", "Customer service"],
    color: "bg-red-500",
  },
  {
    question: "How do you usually hear about new products?",
    options: ["Social media", "Friends and family", "Advertisements", "In-store displays"],
    color: "bg-purple-500",
  },
  {
    question: "Which type of products do you purchase most frequently?",
    options: ["Electronics", "Clothing", "Home essentials", "Food and beverages"],
    color: "bg-yellow-500",
  },
];

export default function Home() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [clicks, setClicks] = useState([]); // Track click coordinates
  const [videoBlob, setVideoBlob] = useState(null);
  const recorderRef = useRef(null);
  const surveyRef = useRef(null);

  // Start recording when component mounts
  useEffect(() => {
    recorderRef.current = new WebPageRecorder({}, (blob) => {
      setVideoBlob(blob);
    }, surveyRef.current);
    recorderRef.current.startRecording();
  }, []);

  const handleAnswerClick = (answer, event) => {
    setAnswers([...answers, answer]);

    // Record the click position
    const clickMarker = {
      x: event.clientX,
      y: event.clientY,
    };
    setClicks([...clicks, clickMarker]);

    // Remove the click marker after 2 seconds
    setTimeout(() => {
      setClicks((prevClicks) =>
        prevClicks.filter((_, index) => index !== prevClicks.length - 1)
      );
    }, 500);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      recorderRef.current.stopRecording();
      setQuizComplete(true);
    }
  };

  const downloadRecording = () => {
    if (videoBlob) {
      const url = window.URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recording.webm';
      a.click();
    }
  };

  return (
    <div
      ref={surveyRef}
      className={`${questions[currentQuestion]?.color} min-h-screen flex flex-col justify-center items-center transition-colors duration-500 relative`}
    >
      {/* Click markers */}
      {clicks.map((click, index) => (
        <span
          key={index}
          className="absolute bg-red-500 rounded-full opacity-75"
          style={{
            top: `${click.y - 10}px`,
            left: `${click.x - 10}px`,
            zIndex: 99,
            width: '20px',
            height: '20px',
            pointerEvents: 'none',
          }}
        ></span>
      ))}

      {quizComplete ? (
        <div className="bg-white p-10 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-600">Thank You!</h2>
          <p className="text-lg text-gray-700">Your responses have been recorded.</p>
          <button
            onClick={downloadRecording}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg mt-4 hover:bg-blue-600 transition duration-300"
          >
            Download Recording
          </button>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Marketing Survey</h2>
          <p className="text-lg text-gray-600 mb-4">{questions[currentQuestion].question}</p>
          <div className="grid grid-cols-1 gap-4 border-[1px] border-gray-200 rounded-lg p-4">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={(e) => handleAnswerClick(option, e)}
                className="relative bg-white text-gray-800 py-2 px-4 rounded-lg shadow-md hover:bg-gray-100 transition duration-300"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
