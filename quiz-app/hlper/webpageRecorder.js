// helper/webpageRecorder.js
import html2canvas from 'html2canvas';

const DEFAULT_CONFIG = {
  fps: 30,
  timeSlice: 3600000,
  recordUserAudio: false,
  bitsPerSecond: 1000000,
  mediaRecorderCodec: 'video/webm;codecs=vp8,opus'
};

export const getMediaRecorderSupportedOptions = (recorderConfig) => {
  const { bitsPerSecond, mediaRecorderCodec } = recorderConfig;

  const supportedOptions = [
    { mimeType: mediaRecorderCodec, bitsPerSecond },
    { mimeType: 'video/webm;codecs=vp8,opus', bitsPerSecond },
    { mimeType: 'video/webm;codecs=h264', bitsPerSecond },
    { mimeType: 'video/webm', bitsPerSecond },
    { mimeType: 'video/mp4', bitsPerSecond },
  ];

  return (
    supportedOptions.find((option) =>
      MediaRecorder.isTypeSupported(option.mimeType),
    ) || {}
  );
};

class WebPageRecorder {
  constructor(webpageRecorderConfig, callback, element) {
    // Merge default config with user-provided config
    this.webpageRecorderConfig = {
      ...DEFAULT_CONFIG,
      ...webpageRecorderConfig,
      bitsPerSecond: 1000000,
  mediaRecorderCodec: 'video/webm;codecs=vp8,opus'
    };
    this.fps = this.webpageRecorderConfig.fps || 30;
    this.callback = callback;
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.canvas = null;
    this.ctx = null;
    this.isRecording = false;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.element = element;
    this.audioStream = null; // To expose the audio stream

    // Bind the stopRecording method
    this.stopRecording = this.stopRecording.bind(this);
  }

  async startRecording(additionalTracks = []) {
    const { recordUserAudio, timeSlice } = this.webpageRecorderConfig;
    const { element } = this;

    if (!element) {
      console.error("No element provided to record.");
      return;
    }

    // Create a canvas to capture the element
    this.canvas = document.createElement('canvas');
    const isElementClientSizeValid = element.clientHeight > 0 && element.clientWidth > 0;
    this.canvas.height = isElementClientSizeValid ? element.clientHeight : window.screen.height;
    this.canvas.width = isElementClientSizeValid ? element.clientWidth : window.screen.width;
    this.ctx = this.canvas.getContext('2d');

    const videoStream = this.canvas.captureStream(this.fps);
    const audioDestination = this.audioContext.createMediaStreamDestination();

    if (recordUserAudio) {
      try {
        const userAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        userAudioStream.getAudioTracks().forEach(track => additionalTracks.push(track));
        this.audioStream = userAudioStream; // Expose the audio stream
      } catch (error) {
        console.error("Error accessing user audio:", error);
      }
    }

    // Connect additional audio tracks
    additionalTracks.forEach(track => {
      const source = this.audioContext.createMediaStreamSource(new MediaStream([track]));
      source.connect(audioDestination);
    });

    try {
      // Combine video and audio tracks into a single stream
      this.stream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);

      const options = getMediaRecorderSupportedOptions(this.webpageRecorderConfig);

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Handle data availability
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      // Handle stopping of the recorder
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this.callback(blob);
        this.cleanup();
      };

      // Start recording
      this.mediaRecorder.start(timeSlice);
      this.isRecording = true;
      this.captureElement(element);
    } catch (error) {
      console.error("Error starting MediaRecorder:", error);
    }
  }

  async captureElement(element) {
    if (!this.isRecording) return;

    try {
      const canvasTemp = await html2canvas(element, {
        useCORS: false,
        logging: false,
        width: this.canvas.width,
        height: this.canvas.height,
      });

      this.ctx.drawImage(canvasTemp, 0, 0, this.canvas.width, this.canvas.height);
      canvasTemp.remove();

      setTimeout(() => {
        requestAnimationFrame(() => this.captureElement(element));
      }, 1000 / this.fps);
    } catch (error) {
      console.error("Error capturing element:", error);
    }
  }

  stopRecording() { // Ensure this method is correctly defined
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.isRecording = false;
  }

  cleanup() {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    this.stream = null;
    this.mediaRecorder = null;
  }
}

export default WebPageRecorder;