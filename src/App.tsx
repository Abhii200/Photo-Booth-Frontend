import React, { useState, useEffect } from 'react';
import { Camera, Printer, Waves, StopCircle } from 'lucide-react';

interface CapturedImage {
  id: string;
  url: string;
  timestamp: string;
}

interface CaptureStatus {
  active: boolean;
  countdown: number | null;
  status: string;
  frame: string | null;
}

function App() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setError(null);
      const response = await fetch('https://photo-booth-backend-1.onrender.com/images');
      if (!response.ok) {
        throw new Error('Server error');
      }
      const data = await response.json();
      setCapturedImages(data);
    } catch (error) {
      setError('Unable to connect to the photo booth server. Please make sure the backend server is running.');
      console.error('Failed to fetch images:', error);
    }
  };

  const startCapture = async () => {
    try {
      setError(null);
      setIsCapturing(true);
      setStatus('Starting capture session...');

      const response = await fetch('https://photo-booth-backend-1.onrender.com/start-capture', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to start capture');

      pollCaptureStatus();
    } catch (error) {
      console.error('Error starting capture:', error);
      setStatus('Failed to start capture');
      setError('Unable to start capture. Please make sure the backend server is running.');
      setIsCapturing(false);
    }
  };

  const stopCapture = async () => {
    try {
      setError(null);
      setStatus('Stopping capture session...');

      const response = await fetch('https://photo-booth-backend-1.onrender.com/stop-capture', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to stop capture');

      setIsCapturing(false);
      setStatus('Capture session stopped');
      clearInterval(pollInterval);
    } catch (error) {
      console.error('Error stopping capture:', error);
      setStatus('Failed to stop capture');
      setError('Unable to stop capture. Please make sure the backend server is running.');
      setIsCapturing(false);
    }
  };

  let pollInterval: NodeJS.Timeout;

  const pollCaptureStatus = () => {
    pollInterval = setInterval(async () => {
      try {
        const response = await fetch('https://photo-booth-backend-1.onrender.com/capture-status');
        if (!response.ok) throw new Error('Server error');

        const data: CaptureStatus = await response.json();
        setCountdown(data.countdown);
        setStatus(data.status);
        setCurrentFrame(data.frame);

        if (data.status === 'captured') {
          fetchImages();
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setError('Lost connection to the photo booth server.');
        clearInterval(pollInterval);
        setIsCapturing(false);
      }
    }, 100); // Increased polling rate for smoother video
  };

  const openModal = (image: CapturedImage) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Camera className="w-10 h-10" />
            Photo Booth
            <Printer className="w-10 h-10" />
          </h1>
          <p className="text-lg text-purple-200">Wave your hand to capture memories!</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-500/20 backdrop-blur-lg rounded-lg p-4 mb-8 text-white text-center">
              {error}
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 mb-8">
            <div className="text-center">
              {isCapturing ? (
                <div className="space-y-4">
                  {currentFrame && (
                    <div className="relative rounded-lg overflow-hidden mb-4">
                      <img
                        src={`data:image/jpeg;base64,${currentFrame}`}
                        alt="Camera feed"
                        className="w-full aspect-video object-cover"
                      />
                      {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-8xl font-bold text-white drop-shadow-lg">
                            {countdown}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-xl">{status}</div>
                  <button
                    onClick={stopCapture}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-full text-xl flex items-center justify-center gap-2 mx-auto"
                  >
                    <StopCircle className="w-6 h-6" />
                    Stop Capture Session
                  </button>
                </div>
              ) : (
                <button
                  onClick={startCapture}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-full text-xl flex items-center justify-center gap-2 mx-auto"
                >
                  <Waves className="w-6 h-6" />
                  Start Capture Session
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capturedImages.map((image) => (
              <div
                key={image.id}
                className="bg-white/10 backdrop-blur-lg rounded-lg p-4 cursor-pointer"
                onClick={() => openModal(image)}
              >
                <img
                  src={image.url}
                  alt={`Captured at ${image.timestamp}`}
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
                <p className="text-sm text-purple-200">{image.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
          onClick={closeModal}
        >
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-full overflow-auto">
            <img
              src={selectedImage.url}
              alt={`Captured at ${selectedImage.timestamp}`}
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
