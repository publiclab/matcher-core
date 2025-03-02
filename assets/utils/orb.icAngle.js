// central difference using image moments to find dominant orientation
// https://inspirit.github.io/jsfeat/sample_orb.html
function icAngle(uMax, img, px, py) {
  const halfK = 15;
  let m01 = 0;
  let m10 = 0;
  const src = img.data;
  const step = img.cols;
  let u = 0;
  let v = 0;
  const centerOff = (py * step + px) | 0;
  let vSum = 0;
  let d = 0;
  let valPlus = 0;
  let valMinus = 0;
  // Treat the center line differently, v=0
  for (u = -halfK; u <= halfK; ++u) {
    m10 += u * src[centerOff + u];
  }
  // Go line by line in the circular patch
  for (v = 1; v <= halfK; ++v) {
    // Proceed over the two lines
    vSum = 0;
    d = uMax[v];
    for (u = -d; u <= d; ++u) {
      valPlus = src[centerOff + u + v * step];
      valMinus = src[centerOff + u - v * step];
      vSum += (valPlus - valMinus);
      m10 += u * (valPlus + valMinus);
    }
    m01 += v * vSum;
  }
  return Math.atan2(m01, m10);
}

exports.icAngle = icAngle;
