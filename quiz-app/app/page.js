"use client";
import { useState, useEffect, useRef } from 'react';
import WebPageRecorder from '@/hlper/webpageRecorder'; // Ensure the path is correct
import AudioVisualizer from '@/hlper/AudioVisualizer';

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
  // New state to track if the quiz has started
  const [started, setStarted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [clicks, setClicks] = useState([]);
  const [videoBlob, setVideoBlob] = useState(null);
  const recorderRef = useRef(null);
  const surveyRef = useRef(null);
  const [audioStream, setAudioStream] = useState(null);

  useEffect(() => {
    // Only initialize and start recording if quiz has started
    if (started) {
      recorderRef.current = new WebPageRecorder(
        {
          fps: 30,
          timeSlice: 3600000,
          recordUserAudio: true,
        },
        (blob) => {
          setVideoBlob(blob);
        },
        surveyRef.current
      );
      recorderRef.current.startRecording();

      const getAudioStream = () => {
        setTimeout(() => {
          if (recorderRef.current.audioStream) {
            setAudioStream(recorderRef.current.audioStream);
          }
        }, 1000);
      };

      getAudioStream();

      // Cleanup when component unmounts or when quiz stops
      return () => {
        if (recorderRef.current) {
          recorderRef.current.stopRecording();
          if (recorderRef.current.audioStream) {
            recorderRef.current.audioStream.getTracks().forEach((track) => track.stop());
          }
        }
      };
    }
  }, [started]); // Dependency array includes 'started'

  const handleStart = () => {
    setStarted(true);
  };

  const handleAnswerClick = (answer, event) => {
    setAnswers([...answers, answer]);

    const clickMarker = {
      x: event.clientX,
      y: event.clientY,
    };
    setClicks([...clicks, clickMarker]);

    setTimeout(() => {
      setClicks((prevClicks) =>
        prevClicks.filter((_, index) => index !== prevClicks.length - 1)
      );
    }, 500);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
      }
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
      className={`min-h-screen flex flex-col justify-center items-center transition-colors duration-500 relative ${
        started && !quizComplete
          ? questions[currentQuestion]?.color
          : 'bg-gray-100'
      }`}
    >
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

      {recorderRef.current?.webpageRecorderConfig.recordUserAudio && audioStream && started && !quizComplete && (
        <div className="absolute top-4 right-4">
          <AudioVisualizer audioStream={audioStream} />
        </div>
      )}

      {/* Start Screen */}
      {!started && !quizComplete && (
        <div className="bg-white p-10 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Welcome to the Marketing Survey</h2>
          <p className="text-lg text-gray-700 mb-6">
            We appreciate your time in completing this survey. Click the button below to begin.
          </p>
          <button
            onClick={handleStart}
            className="bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition duration-300"
          >
            Start
          </button>
        </div>
      )}

      {/* Quiz Content */}
      {started && !quizComplete && (
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

      {/* Completion Screen */}
      {quizComplete && (
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
      )}
    </div>
  );
}