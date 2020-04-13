const jsfeat = require('../js/jsfeat.min.js');
const {icAngle} = require('./orb.icAngle.js');

// expects pre-initialized corners array of:
// `new jsfeat.keypoint_t(0, 0, 0, 0, -1);` empty corners
// https://inspirit.github.io/jsfeat/sample_orb.html
// https://inspirit.github.io/jsfeat/#features2d
function detectKeypoints(img, corners, maxAllowed) {
  // detect features
  let count = jsfeat.yape06.detect(img, corners, 17);
  const uMax = new Int32Array([15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3, 0]);

  // sort by score and reduce the count if needed
  if (count > maxAllowed) {
    jsfeat.math.qsort(corners, 0, count - 1, function(a, b) {
      return (b.score < a.score);
    });
    count = maxAllowed;
  }

  // calculate dominant orientation for each keypoint
  for (let i = 0; i < count; ++i) {
    corners[i].angle = icAngle(uMax, img, corners[i].x, corners[i].y);
  }

  return count;
}

exports.detectKeypoints = detectKeypoints;

