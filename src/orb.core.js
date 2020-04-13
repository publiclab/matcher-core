// Adapted from https://inspirit.github.io/jsfeat/sample_orb.html

// ===================DEPENDENCIES===================
const jsfeat = require('../assets/js/jsfeat.min.js');
const resolve = require('path').resolve;

// ===================UTILS===================
const {detectKeypoints} = require('../assets/utils/orb.detectKeypoints.js');
const {findTransform} = require('../assets/utils/orb.findTransform.js');
const {matchPattern} = require('../assets/utils/orb.matchPattern.js');
const {renderCorners} = require('../assets/utils/orb.renderCorners.js');
const {renderMatches} = require('../assets/utils/orb.renderMatches.js');

// ===================ORB-CORE ALGORITHM===================
const orbify = function(X, Y, cb, args = {}) {
  args.browser = true;
  args.caching =
    args.caching == true || args.caching == undefined ? true : false;
  args.leniency = args.leniency || 30;
  args.dimensions = args.dimensions || [640, 480];
  this.args = args;
  self = this;
  const canvas = document.createElement('CANVAS'),
    c = document.createElement('CANVAS'),
    primaryImage = new Image(),
    secImage = new Image();

  let options,
    matchesArray = [],
    cornersArray = [];

  // in-progress work to accommodate 
  if (typeof X === "string") primaryImage.src = resolve(X);
  if (typeof Y === "string") secImage.src = resolve(Y);
  const img1Width = primaryImage.width || primaryImage.videoWidth || 0;
  const img1Height = primaryImage.height || primaryImage.videoHeight || 0;

  canvas.setAttribute('id', 'canvas');
  canvas.setAttribute('width', self.args.dimensions[0]);
  canvas.setAttribute('height', self.args.dimensions[1]);
  c.setAttribute('id', 'myCanvas');
  c.setAttribute('style', 'border:1px solid #d3d3d3');

  function initialize() {
    c.width = img1Width;
    c.height = img1Height;
    c.style.display = 'none';

    const ctxx = c.getContext('2d');
    ctxx.drawImage(
        primaryImage,
        0,
        0,
        img1Width,
        img1Height
    );

    options.train_pattern();
    console.log('trained pattern');
  };

  (function core() {
    'use strict';

    let ctx,
      imgU8,
      imgU8Smooth,
      screenCorners,
      numCorners,
      screenDescriptors,
      patternCorners,
      patternDescriptors,
      patternPreview,
      matches,
      homo3x3,
      matchMask;

    // our point match structure
    const matchT = (function() {
        function matchT(screenIdx, patternLev, patternIdx, distance) {
          if (typeof screenIdx === 'undefined') {
            screenIdx = 0;
          }
          if (typeof patternLev === 'undefined') {
            patternLev = 0;
          }
          if (typeof patternIdx === 'undefined') {
            patternIdx = 0;
          }
          if (typeof distance === 'undefined') {
            distance = 0;
          }
          matchT.screenIdx = screenIdx;
          matchT.patternLev = patternLev;
          matchT.patternIdx = patternIdx;
          matchT.distance = distance;
        }
        return matchT;
      })(),
      numTrainLevels = 4;

    // https://inspirit.github.io/jsfeat/sample_orb.html
    const demoOpt = function() {
      const params = self.args.params || {};
      this.blur_size = params.blur_size || 5;
      this.lap_thres = params.lap_thres || 30;
      this.eigen_thres = params.eigen_thres || 35;
      this.matchThreshold = params.matchThreshold || 49;

      this.train_pattern = function() {
console.log('width',img1Width);
        const maxPatternSize = 512,
          maxPerLevel = 300,
          scInc = Math.sqrt(2.0),
          ctxx = c.getContext('2d'),
          imgData = ctxx.getImageData(
              0,
              0,
              img1Width,
              img1Height
          ),
          imgg = new jsfeat.matrix_t(
              img1Width,
              img1Height,
              jsfeat.U8_t | jsfeat.C1_t
          ),
          sc0 = Math.min(
              maxPatternSize / img1Width,
              maxPatternSize / img1Height
          ),
          lev0Img = new jsfeat.matrix_t(
              imgU8.cols,
              imgU8.rows,
              jsfeat.U8_t | jsfeat.C1_t
          ),
          levImg = new jsfeat.matrix_t(
              imgU8.cols,
              imgU8.rows,
              jsfeat.U8_t | jsfeat.C1_t
          );

        let lev = 0,
          i = 0,
          sc = 1.0,
          newWidth = (img1Width * sc0) | 0,
          newHeight = (img1Height * sc0) | 0,
          levCorners,
          levDescriptors,
          cornersNum = 0;

        patternPreview = new jsfeat.matrix_t(
            newWidth >> 1,
            newHeight >> 1,
            jsfeat.U8_t | jsfeat.C1_t
        );

        // preallocate corners array
        for (lev = 0; lev < numTrainLevels; ++lev) {
          patternCorners[lev] = [];
          levCorners = patternCorners[lev];
          i = (newWidth * newHeight) >> lev;
          while (--i >= 0) {
            levCorners[i] = new jsfeat.keypoint_t(0, 0, 0, 0, -1);
          }
          patternDescriptors[lev] = new jsfeat.matrix_t(
              32,
              maxPerLevel,
              jsfeat.U8_t | jsfeat.C1_t
          );
        }

        // do the first level
        levCorners = patternCorners[0];
        levDescriptors = patternDescriptors[0];

        jsfeat.imgproc.grayscale(
            imgData.data,
            img1Width,
            img1Height,
            imgg
        );
        jsfeat.imgproc.resample(imgg, lev0Img, newWidth, newHeight);
        jsfeat.imgproc.pyrdown(lev0Img, patternPreview);
        jsfeat.imgproc.gaussian_blur(lev0Img, levImg, options.blur_size | 0);
        cornersNum = detectKeypoints(levImg, levCorners, maxPerLevel);
        jsfeat.orb.describe(levImg, levCorners, cornersNum, levDescriptors);
        /// console.log("train " + levImg.cols + "x" + levImg.rows + " points: " + cornersNum, levCorners);

        sc /= scInc;

        // lets do multiple scale levels
        for (lev = 1; lev < numTrainLevels; ++lev) {
          levCorners = patternCorners[lev];
          levDescriptors = patternDescriptors[lev];
          newWidth = (lev0Img.cols * sc) | 0;
          newHeight = (lev0Img.rows * sc) | 0;
          // we can use Canvas context draw method for faster resize
          // but its nice to demonstrate that you can do everything with jsfeat
          jsfeat.imgproc.resample(lev0Img, levImg, newWidth, newHeight);
          jsfeat.imgproc.gaussian_blur(levImg, levImg, options.blur_size | 0);
          cornersNum = detectKeypoints(levImg, levCorners, maxPerLevel);
          jsfeat.orb.describe(levImg, levCorners, cornersNum, levDescriptors);
          for (i = 0; i < cornersNum; ++i) {
//console.log('scaling', levCorners[i].x, levCorners[i].x *= 1 / sc);
            levCorners[i].x *= 1 / sc;
            levCorners[i].y *= 1 / sc;
          }
          sc /= scInc;
        }
      };
    };

    function demoApp() {
      imgU8 = new jsfeat.matrix_t(self.args.dimensions[0], self.args.dimensions[1], jsfeat.U8_t | jsfeat.C1_t);
      imgU8Smooth = new jsfeat.matrix_t(self.args.dimensions[0], self.args.dimensions[1], jsfeat.U8_t | jsfeat.C1_t);
      screenDescriptors = new jsfeat.matrix_t(
          32,
          500,
          jsfeat.U8_t | jsfeat.C1_t
      );
      patternDescriptors = [];
      screenCorners = [];
      patternCorners = [];
      matches = [];
      homo3x3 = new jsfeat.matrix_t(3, 3, jsfeat.F32C1_t);
      matchMask = new jsfeat.matrix_t(500, 1, jsfeat.U8C1_t);
      options = new demoOpt();

      ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgb(0,255,0)';
      ctx.strokeStyle = 'rgb(0,255,0)';

      let i = self.args.dimensions[0] * self.args.dimensions[1];
      while (--i >= 0) {
        screenCorners[i] = new jsfeat.keypoint_t(0, 0, 0, 0, -1);
        matches[i] = new matchT();
      }
    }

    async function findPoints() {
      console.log('find points');
      if (await cornersArray.length) {
        return true;
      }

      // repeat this method as fast as the browser can run it
      if (args.loop) window.requestAnimationFrame(findPoints);

      const primaryImageData = ctx.getImageData(0, 0, self.args.dimensions[0], self.args.dimensions[1]);

      ctx.putImageData(primaryImageData, 0, 0);
      ctx.drawImage(secImage, 0, 0, self.args.dimensions[0], self.args.dimensions[1]);

      jsfeat.imgproc.grayscale(primaryImageData.data, self.args.dimensions[0], self.args.dimensions[1], imgU8);

      jsfeat.imgproc.gaussian_blur(imgU8, imgU8Smooth, options.blur_size | 0);

      jsfeat.yape06.laplacian_threshold = options.lap_thres | 0;
      jsfeat.yape06.min_eigen_value_threshold = options.eigen_thres | 0;

      numCorners = await detectKeypoints(imgU8Smooth, screenCorners, 500);

      jsfeat.orb.describe(
          imgU8Smooth,
          screenCorners,
          numCorners,
          screenDescriptors
      );

      cornersArray = await renderCorners(
          self.args,
          cornersArray,
          screenCorners,
          numCorners
      );
    }

    async function findMatchedPoints() {
      console.log('find matched points');
      let numMatches = 0,
        goodMatches = 0;
      if (findPoints()) {
        if (await matchesArray.length) {
          return;
        }
        if (args.loop) requestAnimationFrame(findMatchedPoints);
        if (patternPreview) {
          numMatches = await matchPattern(
              matches,
              screenDescriptors,
              patternDescriptors,
              numTrainLevels,
              options
          );
          goodMatches = await findTransform(
              matches,
              numMatches,
              patternCorners,
              screenCorners,
              homo3x3,
              matchMask
          );
        }

        if (numMatches) {
          if (goodMatches >= (numMatches * self.args.leniency) / 100) {
            matchesArray = await renderMatches(
                self.args,
                ctx,
                matches,
                numMatches,
                screenCorners,
                patternCorners,
                matchesArray,
                matchMask
            );
          }
        }
      }
    }

    window.onload = initialize;

    demoApp();

    if(args.query === 'corners') {
      findPoints();
    } else {
      findMatchedPoints();
    }

  })();

  if (
    !self.args.caching ||
    // recur only if both images are changed w.r.t. content (not order)
    (localStorage.getItem('X') !== X && localStorage.getItem('X') !== Y) ||
    (localStorage.getItem('Y') !== X && localStorage.getItem('Y') !== Y)
  ) {
    localStorage.removeItem('utils');
    window.data = null;
  }

  // no timeout async/await polyfill -- by rexagod
  this.utils = new Promise(function(resolve) {
    if (self.args.query === 'corners') {
      setTimeout(function () {
        resolve(cornersArray);
      }, 5000);
    }
    function uncachedResponse() {
      localStorage.setItem(
          'utils',
          JSON.stringify({
            points: cornersArray,
            matched_points: matchesArray,
          })
      );
      localStorage.setItem('X', X);
      localStorage.setItem('Y', Y);
      resolve(JSON.parse(localStorage.getItem('utils')));
      return;
    }
    let timer = 0,
      continueThread = false;
    if (!self.args.caching) {
      setTimeout(uncachedResponse, timer);
    } else {
      if (
        JSON.parse(localStorage.getItem('utils')) &&
        JSON.parse(localStorage.getItem('utils')).points &&
        JSON.parse(localStorage.getItem('utils')).points.length &&
        JSON.parse(localStorage.getItem('utils')).matched_points &&
        JSON.parse(localStorage.getItem('utils')).matched_points.length
      ) {
        // second iteration
        window.data = {
          points: cornersArray,
          matched_points: matchesArray,
        };
        resolve(JSON.parse(localStorage.getItem('utils')));
        this.utils = Promise.resolve(this.utils);
      } else {
        setInterval(function() {
          if (!continueThread) {
            if (!matchesArray.length || !cornersArray.length) {
              timer += 1;
              return;
            } else {
              setTimeout(function() {
                if (continueThread) {
                  return;
                }
                // first iteration
                window.data = {
                  points: cornersArray,
                  matched_points: matchesArray,
                };
                uncachedResponse();
                continueThread = true;
              }, timer);
            }
          } else {
            return;
          }
        }, 1);
      }
    }
  });

  if (cb) {
    cb(this.utils);
  } else {
    console.warn('No callback function supplied');
  }

  return {
    initialize: initialize
  }
};

window.Matcher = orbify;
