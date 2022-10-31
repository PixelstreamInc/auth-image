import './main.css'
import AuthImage from "./components/AuthImage.vue";
import { createC2pa } from 'c2pa';
import wasmSrc from 'c2pa/dist/assets/wasm/toolkit_bg.wasm?url';
import workerSrc from 'c2pa/dist/c2pa.worker.js?url';

export default {
  install: (app) => {
    app.component("AuthImage", AuthImage);
    app.provide("c2paPromise", createC2pa({
      wasmSrc,
      workerSrc,
    }));
  }
};