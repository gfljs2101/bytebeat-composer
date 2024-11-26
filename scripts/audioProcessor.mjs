class audioProcessor extends AudioWorkletProcessor {
	constructor(...args) {
		super(...args);
		this.audioSample = 0;
		this.byteSample = 0;
		this.drawMode = 'Points';
		this.errorDisplayed = true;
		this.func = null;
		this.getValues = null;
		this.isPlaying = false;
		this.playbackSpeed = 1;
		this.lastByteValue = [null, null];
		this.lastFuncValue = [null, null];
		this.lastTime = -1;
		this.mode = 'Bytebeat';
		this.outValue = [0, 0];
		this.sampleRate = 8000;
		this.sampleRatio = 1;
		Object.seal(this);
		audioProcessor.deleteGlobals();
		audioProcessor.freezeGlobals();
		this.port.addEventListener('message', e => this.receiveData(e.data));
		this.port.start();
	}
	static deleteGlobals() {
		// Delete single letter variables to prevent persistent variable errors (covers a good enough range)
		for(let i = 0; i < 26; ++i) {
			delete globalThis[String.fromCharCode(65 + i)];
			delete globalThis[String.fromCharCode(97 + i)];
		}
		// Delete global variables
		for(const name in globalThis) {
			if(Object.prototype.hasOwnProperty.call(globalThis, name)) {
				delete globalThis[name];
			}
		}
	}
	static freezeGlobals() {
		Object.getOwnPropertyNames(globalThis).forEach(name => {
			const prop = globalThis[name];
			const type = typeof prop;
			if((type === 'object' || type === 'function') && name !== 'globalThis') {
				Object.freeze(prop);
			}
			if(type === 'function' && Object.prototype.hasOwnProperty.call(prop, 'prototype')) {
				Object.freeze(prop.prototype);
			}
			Object.defineProperty(globalThis, name, { writable: false, configurable: false });
		});
	}
	static getErrorMessage(err, time) {
		const when = time === null ? 'compilation' : 't=' + time;
		if(!(err instanceof Error)) {
			return `${ when } thrown: ${ typeof err === 'string' ? err : JSON.stringify(err) }`;
		}
		const { message, lineNumber, columnNumber } = err;
		return `${ when } error: ${ typeof message === 'string' ? message : JSON.stringify(message) }${
			typeof lineNumber === 'number' && typeof columnNumber === 'number' ?
				` (at line ${ lineNumber - 3 }, character ${ +columnNumber })` : '' }`;
	}
	process(inputs, [chData]) {
		const chDataLen = chData[0].length;
		if(!chDataLen || !this.isPlaying) {
			return true;
		}
		let time = this.sampleRatio * this.audioSample;
		let { byteSample } = this;
		const drawBuffer = [];
		const isDiagram = this.drawMode === 'Combined' || this.drawMode === 'Diagram';
		for(let i = 0; i < chDataLen; ++i) {
			time += this.sampleRatio;
			const currentTime = Math.floor(time);
			if(this.lastTime !== currentTime) {
				let funcValue;
				const currentSample = Math.floor(byteSample);
				try {
					if(this.mode === 'Funcbeat') {
						funcValue = this.func(currentSample / this.sampleRate, this.sampleRate);
					} else {
						funcValue = this.func(currentSample);
					}
				} catch(err) {
					if(this.errorDisplayed) {
						this.errorDisplayed = false;
						this.sendData({
							error: {
								message: audioProcessor.getErrorMessage(err, currentSample),
								isRuntime: true
							}
						});
					}
					funcValue = NaN;
				}
				funcValue = Array.isArray(funcValue) ? [funcValue[0], funcValue[1]] : [funcValue, funcValue];
				let hasValue = false;
				let ch = 2;
				while(ch--) {
					try {
						funcValue[ch] = +funcValue[ch];
					} catch(err) {
						funcValue[ch] = NaN;
					}
					if(isDiagram) {
						if(!isNaN(funcValue[ch])) {
							this.outValue[ch] = this.getValues(funcValue[ch], ch);
						} else {
							this.lastByteValue[ch] = NaN;
						}
						hasValue = true;
						continue;
					}
					if(funcValue[ch] === this.lastFuncValue[ch]) {
						continue;
					} else if(!isNaN(funcValue[ch])) {
						this.outValue[ch] = this.getValues(funcValue[ch], ch);
						hasValue = true;
					} else if(!isNaN(this.lastFuncValue[ch])) {
						this.lastByteValue[ch] = NaN;
						hasValue = true;
					}
				}
				if(hasValue) {
					drawBuffer.push({ t: currentSample, value: [...this.lastByteValue] });
				}
				byteSample += currentTime - this.lastTime;
				this.lastFuncValue = funcValue;
				this.lastTime = currentTime;
			}
			chData[0][i] = this.outValue[0];
			chData[1][i] = this.outValue[1];
		}
		if(Math.abs(byteSample) > Number.MAX_SAFE_INTEGER) {
			this.resetTime();
			return true;
		}
		this.audioSample += chDataLen;
		let isSend = false;
		const data = {};
		if(byteSample !== this.byteSample) {
			isSend = true;
			data.byteSample = this.byteSample = byteSample;
		}
		if(drawBuffer.length) {
			isSend = true;
			data.drawBuffer = drawBuffer;
		}
		if(isSend) {
			this.sendData(data);
		}
		return true;
	}
	receiveData(data) {
		if(data.byteSample !== undefined) {
			this.byteSample = +data.byteSample || 0;
			this.resetValues();
		}
		if(data.errorDisplayed === true) {
			this.errorDisplayed = true;
		}
		if(data.isPlaying !== undefined) {
			this.isPlaying = data.isPlaying;
		}
		if(data.playbackSpeed !== undefined) {
			const sampleRatio = this.sampleRatio / this.playbackSpeed;
			this.playbackSpeed = data.playbackSpeed;
			this.setSampleRatio(sampleRatio);
		}
		if(data.mode !== undefined) {
			this.mode = data.mode;
			switch(data.mode) {
				case 'Bytebeat':
					this.getValues = (funcValue) => (funcValue & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (funcValue & 255);
					break;
				case 'Signed Bytebeat':
					this.getValues = (funcValue) =>
						((funcValue + 128) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (funcValue + 128 & 255);
					break;
				case 'Floatbeat':
				case 'Funcbeat':
					this.getValues = (funcValue) => {
						return Math.max(Math.min(funcValue, 1), -1);
					};
					this.getValuesVisualizer = (funcValue) => (Math.max(Math.min(funcValue, 1), -1) * 127.5 + 128);
					break;
				case '-2Func2beat':
					this.getValues = (funcValue) => {
						return Math.max(Math.min(funcValue, 2), -2);
					};
					this.getValuesVisualizer = (funcValue) => (Math.max(Math.min(funcValue, 1), -1) * 127.5 + 128);
					break;
				case 'Bitbeat':
					this.getValues = (funcValue) => ((funcValue & 1) - 0.5);
					this.getValuesVisualizer = (funcValue) => (funcValue & 1 ? 192 : 64);
					break;
				case '2048':
					this.getValues = (funcValue) => {
						return (funcValue & 2047) / 1020 - 1
					};
					this.getValuesVisualizer = (funcValue) => (Math.floor(funcValue / 8) & 255);
					break;
				case 'logmode':
					this.getValues = (funcValue) => ((Math.log2(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.log2(funcValue) * 32) & 255);
					break;
				case 'logHack':
					this.getValues = (funcValue) => {
						const neg = (funcValue < 0) ? -32 : 32;
						return ((Math.log2(Math.abs(funcValue)) * neg) & 255) / 127.5 - 1;
					};
					this.getValuesVisualizer = (funcValue) => (Math.log2(Math.abs(funcValue)) * ((funcValue < 0) ? -32 : 32)) & 255;
					break;
				case 'logHack2':
					this.getValues = (funcValue) => {
						const neg = funcValue < 0
						return funcValue == 0 ? 0 : ((((Math.log2(Math.abs(funcValue)) * (neg ? -16 : 16)) + (neg ? -127 : 128)) & 255) / 127.5 - 1);
					};
					this.getValuesVisualizer = (funcValue) => {
						const neg = funcValue < 0
						return funcValue == 0 ? 128 : (((Math.log2(Math.abs(funcValue)) * (neg ? -16 : 16)) + (neg ? -127 : 128)) & 255);
					};
					break;
				case 'sinmode':
					this.getValues = (funcValue) => ((Math.sin(funcValue) * 127)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.sin(funcValue) * 127) & 255) + 127);
					break;
				case 'tanmode':
					this.getValues = (funcValue) => ((Math.tan(funcValue) * 64)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.tan(funcValue) * 127) & 255) + 127);
					break;
				case 'tanmodenew':
					this.getValues = (funcValue) => ((Math.tan(funcValue) * 64)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.tan(funcValue) * 127) & 255) + 127);
					break;
				case 'cosmode':
					this.getValues = (funcValue) => ((Math.cos(funcValue) * 127)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.cos(funcValue) * 127) & 255) + 127);
					break;
				case 'absmode':
					this.getValues = (funcValue) => ((Math.abs(funcValue)) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.abs(funcValue)) & 255);
					break;
				case 'cbrtmode':
					this.getValues = (funcValue) => ((Math.cbrt(funcValue)) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.cbrt(funcValue)) & 255));
					break;
				case 'sinhmode':
					this.getValues = (funcValue) => ((Math.sinh(funcValue) * 127)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.sinh(funcValue) * 127) & 255) + 127);
					break;
				case 'asinmode':
					this.getValues = (funcValue) => ((Math.asin(funcValue) * 127)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.asin(funcValue) * 127) & 255) + 127);
					break;
				case 'coshmode':
					this.getValues = (funcValue) => ((Math.cosh(funcValue) * 127)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.cosh(funcValue) * 127) & 255) + 127);
					break;
				case 'tanhmode':
					this.getValues = (funcValue) => ((Math.tanh(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.tanh(funcValue) * 128) & 255) + 127);
					break;
				case 'tanhmodenew':
					this.getValues = (funcValue) => ((Math.tanh(funcValue) * 127)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.tanh(funcValue) * 127) & 255) + 127);
					break;
				case 'acosmode':
					this.getValues = (funcValue) => ((Math.acos(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.acos(funcValue) * 128) & 255) + 127);
					break;
				case 'atanmode':
					this.getValues = (funcValue) => ((Math.atan(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.atan(funcValue) * 128) & 255) + 127);
					break;
				case 'atanmodenew':
					this.getValues = (funcValue) => ((Math.atan(funcValue) * 127)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.atan(funcValue) * 127) & 255) + 127);
					break;
				case 'log10mode':
					this.getValues = (funcValue) => ((Math.log10(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.log10(funcValue) * 32) & 255);
					break;
				case 'sqrtmode':
					this.getValues = (funcValue) => ((Math.sqrt(funcValue)) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.sqrt(funcValue)) & 255);
					break;
				case 'sinfmode':
					this.getValues = (funcValue) => ((Math.sin(funcValue * Math.PI / 128) * 32)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.sin(funcValue / (128 / Math.PI)) * 127) & 255) + 127);
					break;
				case 'tanfmode':
					this.getValues = (funcValue) => ((Math.tan(funcValue * Math.PI / 128) * 32)) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.tan(funcValue / (128 / Math.PI)) * 127) & 255) + 127);
					break;
				case 'cosfmode':
					this.getValues = (funcValue) => ((Math.cos(funcValue * Math.PI / 128))) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((Math.cos(funcValue / (128 / Math.PI)) * 127) & 255) + 127);
					break;
				case 'sinmodeold':
					this.getValues = (funcValue) => ((Math.sin(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.sin(funcValue) * 32) & 255);
					break;
				case 'cosmodeold':
					this.getValues = (funcValue) => ((Math.cos(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.cos(funcValue) * 32) & 255);
					break;
				case 'asinmodeold':
					this.getValues = (funcValue) => ((Math.asin(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.asin(funcValue) * 32) & 255);
					break;
				case 'acosmodeold':
					this.getValues = (funcValue) => ((Math.acos(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.acos(funcValue) * 32) & 255);
					break;
				case 'sinhmodeold':
					this.getValues = (funcValue) => ((Math.sinh(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.sinh(funcValue) * 32) & 255);
					break;
				case 'coshmodeold':
					this.getValues = (funcValue) => ((Math.cosh(funcValue) * 32) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((Math.cosh(funcValue) * 32) & 255);
					break;
				case '4080':
					this.getValues = (funcValue) => {
						return (funcValue & 4079) / 2040 - 1
					};
					this.getValuesVisualizer = (funcValue) => (Math.floor(funcValue / 16) & 255);
					break;
				case '8160':
					this.getValues = (funcValue) => {
						return (funcValue & 8159) / 4080 - 1
					};
					this.getValuesVisualizer = (funcValue) => (Math.floor(funcValue / 32) & 255);
					break;
				case 'doublebeat':
					this.getValues = (funcValue) => {
						return Math.max(Math.min(funcValue, 255), -255);
					};
					this.getValuesVisualizer = (funcValue) => (Math.max(Math.min(funcValue, 255), -255) * 127.5 + 128);
					break;
				case 'nolimit':
					this.getValues = (funcValue) => (funcValue) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (funcValue);
					break;
				case 'floatbeat2insteadof1':
					this.getValues = (funcValue) => {
						return Math.max(Math.min(funcValue, 2), -2);
					};
					this.getValuesVisualizer = (funcValue) => (Math.max(Math.min(funcValue, 2), -2) * 127.5 + 128);
					break;
				case 'signednolimit':
					this.getValues = (funcValue) => (funcValue + 128) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (funcValue + 128);
					break;
				case 'Byte&beat>>12':
					this.getValues = (funcValue) => (funcValue & funcValue >> 12 & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (funcValue & funcValue >> 12 & 255);
					break;
				case 'Trianglebeat':
					this.getValues = (funcValue) => (((funcValue<<1)^-(funcValue>>7&1)) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => ((funcValue<<1)^-(funcValue>>7&1) & 255);
					break;
				case 'PWMbeat':
					this.getValues = (funcValue) => (((-funcValue/2&127)+(-funcValue>>8&127)&128)+64 & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((-funcValue/2&127)+(-funcValue>>8&127)&128)+64 & 255);
					break;
				case 'PWMbeat2':
					this.getValues = (funcValue) => (((funcValue/2&127)+(funcValue>>8&127)&128)+64 & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (((funcValue/2&127)+(funcValue>>8&127)&128)+64 & 255);
					break;
				case 'SignedByte&beat>>12':
					this.getValues = (funcValue) => ((funcValue & funcValue >> 12 + 128) & 255) / 127.5 - 1;
					this.getValuesVisualizer = (funcValue) => (funcValue & funcValue >> 12 + 128);
					break;
			default: this.getValues = (funcValue, ch) => (this.lastByteValue[ch] = NaN);
			}
		}
		if(data.drawMode !== undefined) {
			this.drawMode = data.drawMode;
		}
		if(data.setFunction !== undefined) {
			this.setFunction(data.setFunction);
		}
		if(data.resetTime === true) {
			this.resetTime();
		}
		if(data.sampleRate !== undefined) {
			this.sampleRate = data.sampleRate;
		}
		if(data.sampleRatio !== undefined) {
			this.setSampleRatio(data.sampleRatio);
		}
	}
	sendData(data) {
		this.port.postMessage(data);
	}
	resetTime() {
		this.byteSample = 0;
		this.resetValues();
		this.sendData({ byteSample: 0 });
	}
	resetValues() {
		this.audioSample = 0;
		this.lastByteValue = this.lastFuncValue = [null, null];
		this.lastTime = -1;
		this.outValue = [0, 0];
	}
	setFunction(codeText) {
		// Create shortened Math functions
		const params = Object.getOwnPropertyNames(Math);
		const values = params.map(k => Math[k]);
		params.push('int', 'window');
		values.push(Math.floor, globalThis);
		audioProcessor.deleteGlobals();
		// Bytebeat code testing
		let isCompiled = false;
		const oldFunc = this.func;
		try {
			if(this.mode === 'Funcbeat') {
				this.func = new Function(...params, codeText).bind(globalThis, ...values);
			} else {
				// Optimize code like eval(unescape(escape`XXXX`.replace(/u(..)/g,"$1%")))
				codeText = codeText.trim().replace(
					/^eval\(unescape\(escape(?:`|\('|\("|\(`)(.*?)(?:`|'\)|"\)|`\)).replace\(\/u\(\.\.\)\/g,["'`]\$1%["'`]\)\)\)$/,
					(match, m1) => unescape(escape(m1).replace(/u(..)/g, '$1%')));
				this.func = new Function(...params, 't', `return 0,\n${ codeText || 0 };`)
					.bind(globalThis, ...values);
			}
			isCompiled = true;
			if(this.mode === 'Funcbeat') {
				this.func = this.func();
			}
			this.func(0);
		} catch(err) {
			if(!isCompiled) {
				this.func = oldFunc;
			}
			this.errorDisplayed = false;
			this.sendData({
				error: {
					message: audioProcessor.getErrorMessage(err, isCompiled ? 0 : null),
					isCompiled
				},
				updateUrl: isCompiled
			});
			return;
		}
		this.errorDisplayed = false;
		this.sendData({ error: { message: '', isCompiled }, updateUrl: true });
	}
	setSampleRatio(sampleRatio) {
		const timeOffset = Math.floor(this.sampleRatio * this.audioSample) - this.lastTime;
		this.sampleRatio = sampleRatio * this.playbackSpeed;
		this.lastTime = Math.floor(this.sampleRatio * this.audioSample) - timeOffset;
	}
}

registerProcessor('audioProcessor', audioProcessor);
