return (s, sr) => {
  // Calculate the sample length
  let t = s * sr;

  // Calculate the sample rate ratio
  let sample_rate_ratio = 32000 / sr;

  // Adjust the sample length based on the sample rate ratio
  t *= sample_rate_ratio;

  // Calculate the floatbeat signal
  let floatbeat = 1.5 * (sin((t / 1024 * (t & t >> 12)) * PI / 128) / 4 + sin(20 * cbrt(t % 16384)) / 6 + sin(10 * cbrt(t % 8192)) / 3);

  // Calculate the sample length
  let u = s * sr;

  // Calculate the bytebeat signal
  let bytebeat = t / 32;

  // Calculate the bytebeat2 signal
  let bytebeat2 = sin(t * ((t >> 13 | t >> 11 | t >> 14) % 128 / 16) * PI / 256) * 127 + 127;

  // Calculate the noise signal
  let noise = t & 16384 ? (random() * 255 | t >> 6) : 255;

  // Calculate the fortytwomelody signal
  let fortytwomelody = sin((2 * t * (42 & t >> 12) / 8) * PI / 128);

  // Calculate the fortytwomelody2 signal
  let fortytwomelody2 = t * (42 & t >> 12) / 4;

  // Calculate the bytebeat3 signal
  let bytebeat3 = (16 * (80000 / (t & 16383)));

  // Calculate the bytebeat4 signal
  let bytebeat4 = (t >> t / 16);

  // Calculate the bytebeat5 signal
  let bytebeat5 = (t / (t & t >> 12) / 64);

  // Combine the various signals to create the final output
  return ((1.5 * (1.2 * (2.8 * ((((((((((((((((((((((sin((20 * (2 * t % 65536 + .01) ** .3) + ((200 * bytebeat2 & 128) / 128 - 1) / 1.5) / 2 + (16 * 65536 * 2 * ((noise & 255) / 128 - 1) / 1.5) / 2 - .3) / 2 + 4 * 250000 * (fortytwomelody) / 2) / 2 - 4 * 90000 * (floatbeat)) / 8 + 8192 * (bytebeat2 & 255) / 128 / 4 - 0.5) + 1500 * (((bytebeat3 & 255) / 128 - 1) / 2) - 0.2) / 1.5 + 8192 * ((((bytebeat4 & 255) / 128 - 1) / 3) - 0.2) / 2) + 0.3) / 4) - 0.3)) + 8192 * ((fortytwomelody2) % 256 / 128 - 1) / 4) / 2 + 0.25 + (((bytebeat & 255) / 128 - 1)) / .9) / 13 - 0.2 + 256 * ((bytebeat5 & 255) / 128 - 1) / 4 + 2 * 256 * (2 * (sin((((t / 4096 * (t & t >> 12))) * PI / 128))) ) / 4) / 4) / 1.2 - 0.1) / 1.8) / 1.5) / 1.5 + (64 * (sin((s * 3.8 % 1.9456434 + .01) ** .3 * 240) / 4) + 0.08) / 1.4) / 1.5) - 0.1) / 2.2 + 0.3) / 2.5) / 2 - 0.2) / 2 - 0) / 5) / 1.8);
};