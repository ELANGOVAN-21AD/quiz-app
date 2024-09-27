import html2canvas from 'html2canvas';

const DEFAULT_CONFIG = {
  fps: 30,
  timeSlice: 3600000,
  recordUserAudio: false,
};

class WebPageRecorder {
  constructor(webpageRecorderConfig, callback, element) {
    this.webpageRecorderConfig = {
      ...DEFAULT_CONFIG,
      ...webpageRecorderConfig,
    };
    this.fps = webpageRecorderConfig.fps || 30;
    this.callback = callback;
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.canvas = null;
    this.ctx = null;
    this.isRecording = false;
    this.stopRecording = this.stopRecording.bind(this);
    this.audioContext = new window.AudioContext();
    this.element = element;
  }

  async startRecording(additionalTracks = []) {
    const { recordUserAudio, timeSlice } = this.webpageRecorderConfig;
    const { element} = this;

    this.canvas = document.createElement('canvas');
    const isElementClientSizeValid =
      element.clientHeight > 0 && element.clientWidth > 0;
    this.canvas.height = isElementClientSizeValid
      ? element.clientHeight
      : window.screen.height;
    this.canvas.width = isElementClientSizeValid
      ? element.clientWidth
      : window.screen.width;
    this.ctx = this.canvas.getContext('2d');

    const videoStream = this.canvas.captureStream(this.fps);
    const audioDestination = this.audioContext.createMediaStreamDestination();

    if (recordUserAudio) {
      try {
        const userAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        userAudioStream.getAudioTracks().forEach((track) => {
          additionalTracks.push(track);
        });
        // eslint-disable-next-line no-empty
      } catch (error) {}
    }

    additionalTracks.forEach((track) => {
      const source = this.audioContext.createMediaStreamSource(
        new MediaStream([track]),
      );
      source.connect(audioDestination);
    });

    try {
      this.stream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);

      this.mediaRecorder = new MediaRecorder(
        this.stream,
      );

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this.callback(blob);
        this.cleanup();
      };

      this.mediaRecorder.start(timeSlice);
      this.isRecording = true;
      this.captureElement(element);
    } catch (error) {
    }
  }

  async captureElement(element) {
    if (!this.isRecording) return;

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
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.isRecording = false;
  }

  cleanup() {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    this.stream = null;
    this.mediaRecorder = null;
  }
}

export default WebPageRecorder;
