(function() {
  var ColorMap, Component, Crosshairs, DataField, DataPanel, Image, Layer, LayerList, SelectComponent, SliderComponent, TextFieldComponent, Threshold, Transform, UserInterface, View, ViewSettings, Viewer,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  window.Viewer || (window.Viewer = {});


  /* VARIOUS HELPFUL FUNCTIONS */

  window.typeIsArray = Array.isArray || function(value) {
    return {}.toString.call(value) === '[object Array]';
  };

  Array.prototype.diff = function(a) {
    return this.filter(function(i) {
      return !(a.indexOf(i) > -1);
    });
  };

  window.Viewer = Viewer = (function() {
    Viewer.AXIAL = 2;

    Viewer.CORONAL = 1;

    Viewer.SAGITTAL = 0;

    Viewer.XAXIS = 0;

    Viewer.YAXIS = 1;

    Viewer.ZAXIS = 2;

    function Viewer(layerListId, layerSettingClass, cache, options) {
      var xyz;
      this.cache = cache != null ? cache : true;
      if (options == null) {
        options = {};
      }
      xyz = 'xyz' in options ? options.xyz : [0.0, 0.0, 0.0];
      this.coords_ijk = Transform.atlasToImage(xyz);
      this.coords_abc = Transform.atlasToViewer(xyz);
      this.viewSettings = new ViewSettings(options);
      this.views = [];
      this.sliders = {};
      this.dataPanel = new DataPanel(this);
      this.layerList = new LayerList();
      this.userInterface = new UserInterface(this, layerListId, layerSettingClass);
      if (this.cache && (typeof amplify !== "undefined" && amplify !== null)) {
        this.cache = amplify.store;
      }
    }

    Viewer.prototype.coords_xyz = function() {
      return Transform.imageToAtlas(this.coords_ijk);
    };

    Viewer.prototype.paint = function() {
      var l, len, len1, n, q, ref, ref1, v;
      $(this).trigger("beforePaint");
      if (this.layerList.activeLayer) {
        this.userInterface.updateThresholdSliders(this.layerList.activeLayer.image);
        this.updateDataDisplay();
      }
      ref = this.views;
      for (n = 0, len = ref.length; n < len; n++) {
        v = ref[n];
        v.clear();
        ref1 = this.layerList.layers.slice(0).reverse();
        for (q = 0, len1 = ref1.length; q < len1; q++) {
          l = ref1[q];
          if (l.visible) {
            v.paint(l);
          }
        }
        v.drawCrosshairs();
        v.drawLabels();
      }
      $(this).trigger("beforePaint");
      return true;
    };

    Viewer.prototype.clear = function() {
      var len, n, ref, results, v;
      ref = this.views;
      results = [];
      for (n = 0, len = ref.length; n < len; n++) {
        v = ref[n];
        results.push(v.clear());
      }
      return results;
    };

    Viewer.prototype.resetCanvas = function() {
      var len, n, ref, results, v;
      ref = this.views;
      results = [];
      for (n = 0, len = ref.length; n < len; n++) {
        v = ref[n];
        results.push(v.resetCanvas());
      }
      return results;
    };

    Viewer.prototype.addView = function(element, dim, index, labels) {
      if (labels == null) {
        labels = true;
      }
      return this.views.push(new View(this, this.viewSettings, element, dim, index, labels));
    };

    Viewer.prototype.addSlider = function(name, element, orientation, min, max, value, step, dim, textField) {
      var len, n, results, v, views;
      if (dim == null) {
        dim = null;
      }
      if (textField == null) {
        textField = null;
      }
      if (name.match(/nav/)) {
        views = (function() {
          var len, n, ref, results;
          ref = this.views;
          results = [];
          for (n = 0, len = ref.length; n < len; n++) {
            v = ref[n];
            if (v.dim === dim) {
              results.push(v);
            }
          }
          return results;
        }).call(this);
        results = [];
        for (n = 0, len = views.length; n < len; n++) {
          v = views[n];
          results.push(v.addSlider(name, element, orientation, min, max, value, step, textField));
        }
        return results;
      } else {
        return this.userInterface.addSlider(name, element, orientation, min, max, value, step, textField);
      }
    };

    Viewer.prototype.addTextField = function(name, element) {
      return this.userInterface.addTextField(name, element);
    };

    Viewer.prototype.addDataField = function(name, element) {
      return this.dataPanel.addDataField(name, element);
    };

    Viewer.prototype.addAxisPositionField = function(name, element, dim) {
      return this.dataPanel.addAxisPositionField(name, element, dim);
    };

    Viewer.prototype.addColorSelect = function(element) {
      return this.userInterface.addColorSelect(element);
    };

    Viewer.prototype.addSignSelect = function(element) {
      return this.userInterface.addSignSelect(element);
    };

    Viewer.prototype.addSettingsCheckboxes = function(element, options) {
      var len, n, o, settings;
      if (options === 'standard') {
        options = ['crosshairs', 'panzoom', 'labels'];
      }
      settings = {};
      options = (function() {
        var len, n, results;
        results = [];
        for (n = 0, len = options.length; n < len; n++) {
          o = options[n];
          if (o === 'crosshairs' || o === 'panzoom' || o === 'labels') {
            results.push(o);
          }
        }
        return results;
      })();
      for (n = 0, len = options.length; n < len; n++) {
        o = options[n];
        settings[o] = this.viewSettings[o + 'Enabled'];
      }
      return this.userInterface.addSettingsCheckboxes(element, settings);
    };

    Viewer.prototype._loadImage = function(data, options) {
      var error, layer;
      layer = new Layer(new Image(data), options);
      this.layerList.addLayer(layer);
      try {
        if (this.cache && options.cache) {
          return amplify.store(layer.name, data);
        }
      } catch (_error) {
        error = _error;
        return "";
      }
    };

    Viewer.prototype._loadImageFromJSON = function(options) {
      return $.getJSON(options.url, (function(_this) {
        return function(data) {
          return _this._loadImage(data, options);
        };
      })(this));
    };

    Viewer.prototype._loadImageFromVolume = function(options) {
      var dfd, r, v;
      dfd = $.Deferred();
      $('body').append("<div id='xtk_tmp' style='display: none;'></div>");
      r = new X.renderer2D();
      r.container = 'xtk_tmp';
      r.orientation = 'X';
      r.init();
      r.interactor.config.KEYBOARD_ENABLED = false;
      r.interactor.config.MOUSECLICKS_ENABLED = false;
      r.interactor.config.MOUSEWHEEL_ENABLED = false;
      r.interactor.init();
      v = new X.volume();
      v.file = options.url + '?.nii.gz';
      r.add(v);
      r.render();
      r.onShowtime = (function(_this) {
        return function() {
          var data;
          r.destroy();
          data = {
            data3d: v.image,
            dims: v.dimensions
          };
          _this._loadImage(data, options);
          $('#xtk_tmp').remove();
          return dfd.resolve('Finished loading from volume');
        };
      })(this);
      return dfd.promise();
    };

    Viewer.prototype.loadImages = function(images, activate, paint, assignColors) {
      var ajaxReqs, data, existingLayers, img, len, n;
      if (activate == null) {
        activate = null;
      }
      if (paint == null) {
        paint = true;
      }
      if (assignColors == null) {
        assignColors = false;
      }

      /* Load one or more images. If activate is an integer, activate the layer at that 
      index. Otherwise activate the last layer in the list by default. When assignColors 
      is true, viewer will load each image with the next available color palette unless 
      color is explicitly specified.
       */
      if (!typeIsArray(images)) {
        images = [images];
      }
      ajaxReqs = [];
      existingLayers = this.layerList.getLayerNames();
      images = (function() {
        var len, n, ref, results;
        results = [];
        for (n = 0, len = images.length; n < len; n++) {
          img = images[n];
          if (ref = img.name, indexOf.call(existingLayers, ref) < 0) {
            results.push(img);
          }
        }
        return results;
      })();
      for (n = 0, len = images.length; n < len; n++) {
        img = images[n];
        if (assignColors && (img.colorPalette == null)) {
          img.colorPalette = this.layerList.getNextColor();
        }
        if ((data = img.data) || (this.cache && (data = this.cache(img.name)))) {
          this._loadImage(data, img);
        } else if (img.url.match(/\.json$/) || img.json) {
          ajaxReqs.push(this._loadImageFromJSON(img));
        } else {
          ajaxReqs.push(this._loadImageFromVolume(img));
        }
      }
      return $.when.apply($, ajaxReqs).then((function(_this) {
        return function() {
          var i, order;
          order = (function() {
            var len1, q, results;
            results = [];
            for (q = 0, len1 = images.length; q < len1; q++) {
              i = images[q];
              results.push(i.name);
            }
            return results;
          })();
          _this.sortLayers(order.reverse());
          _this.selectLayer(activate != null ? activate : activate = 0);
          _this.updateUserInterface();
          return $(_this).trigger('imagesLoaded');
        };
      })(this));
    };

    Viewer.prototype.clearImages = function() {
      this.layerList.clearLayers();
      this.updateUserInterface();
      this.clear();
      return $(this).trigger('imagesCleared');
    };

    Viewer.prototype.downloadImage = function(index) {
      var url;
      url = this.layerList.layers[index].download;
      if (url) {
        return window.location.replace(url);
      }
    };

    Viewer.prototype.selectLayer = function(index) {
      this.layerList.activateLayer(index);
      this.userInterface.updateLayerSelection(this.layerList.getActiveIndex());
      this.updateDataDisplay();
      this.userInterface.updateThresholdSliders(this.layerList.activeLayer.image);
      this.userInterface.updateComponents(this.layerList.activeLayer.getSettings());
      return $(this).trigger('layerSelected');
    };

    Viewer.prototype.deleteLayer = function(target) {
      this.layerList.deleteLayer(target);
      this.updateUserInterface();
      return $(this).trigger('layerDeleted');
    };

    Viewer.prototype.toggleLayer = function(index) {
      this.layerList.layers[index].toggle();
      this.userInterface.updateLayerVisibility(this.layerList.getLayerVisibilities());
      this.paint();
      return $(this).trigger('layerToggled');
    };

    Viewer.prototype.sortLayers = function(layers, paint) {
      if (paint == null) {
        paint = false;
      }
      this.layerList.sortLayers(layers);
      this.userInterface.updateLayerVisibility(this.layerList.getLayerVisibilities());
      if (paint) {
        return this.paint();
      }
    };

    Viewer.prototype.updateUserInterface = function() {
      this.userInterface.updateLayerList(this.layerList.getLayerNames(), this.layerList.getActiveIndex());
      this.userInterface.updateLayerVisibility(this.layerList.getLayerVisibilities());
      this.userInterface.updateLayerSelection(this.layerList.getActiveIndex());
      if (this.layerList.activeLayer != null) {
        this.userInterface.updateComponents(this.layerList.activeLayer.getSettings());
      }
      return this.paint();
    };

    Viewer.prototype.updateSettings = function(settings) {
      this.layerList.updateActiveLayer(settings);
      return this.paint();
    };

    Viewer.prototype.updateDataDisplay = function() {
      var activeLayer, currentCoords, currentValue, data, ref, x, y, z;
      activeLayer = this.layerList.activeLayer;
      ref = this.coords_ijk, x = ref[0], y = ref[1], z = ref[2];
      currentValue = activeLayer.image.data[z][y][x];
      currentCoords = Transform.imageToAtlas(this.coords_ijk.slice(0)).join(', ');
      data = {
        voxelValue: currentValue,
        currentCoords: currentCoords
      };
      return this.dataPanel.update(data);
    };

    Viewer.prototype.updateViewSettings = function(options, paint) {
      if (paint == null) {
        paint = false;
      }
      this.viewSettings.updateSettings(options);
      if (paint) {
        return this.paint();
      }
    };

    Viewer.prototype.moveToViewerCoords = function(dim, cx, cy) {
      var cxyz;
      if (cy == null) {
        cy = null;
      }
      $(this).trigger('beforeLocationChange');
      if (cy != null) {
        cxyz = [cx, cy];
        cxyz.splice(dim, 0, this.coords_abc[dim]);
      } else {
        cxyz = this.coords_abc;
        cxyz[dim] = cx;
      }
      this.coords_abc = cxyz;
      this.coords_ijk = Transform.atlasToImage(Transform.viewerToAtlas(this.coords_abc));
      this.paint();
      return $(this).trigger('afterLocationChange');
    };

    Viewer.prototype.moveToAtlasCoords = function(coords, paint) {
      if (paint == null) {
        paint = true;
      }
      this.coords_ijk = Transform.atlasToImage(coords);
      this.coords_abc = Transform.atlasToViewer(coords);
      if (paint) {
        return this.paint();
      }
    };

    Viewer.prototype.deleteView = function(index) {
      return this.views.splice(index, 1);
    };

    Viewer.prototype.jQueryInit = function() {
      return this.userInterface.jQueryInit();
    };

    return Viewer;

  })();

  Image = (function() {
    function Image(data) {
      var i, j, k, len, n, p, q, ref, ref1, ref2, ref3, ref4, ref5, t, u, value, vec;
      ref = data.dims, this.x = ref[0], this.y = ref[1], this.z = ref[2];
      if ('data3d' in data) {
        this.min = 0;
        this.max = 0;
        this.data = [];
        for (i = n = 0, ref1 = this.x; 0 <= ref1 ? n < ref1 : n > ref1; i = 0 <= ref1 ? ++n : --n) {
          this.data[i] = [];
          for (j = q = 0, ref2 = this.y; 0 <= ref2 ? q < ref2 : q > ref2; j = 0 <= ref2 ? ++q : --q) {
            this.data[i][j] = [];
            for (k = t = 0, ref3 = this.z; 0 <= ref3 ? t < ref3 : t > ref3; k = 0 <= ref3 ? ++t : --t) {
              value = Math.round(data.data3d[i][j][k] * 100) / 100;
              if (value > this.max) {
                this.max = value;
              }
              if (value < this.min) {
                this.min = value;
              }
              this.data[i][j][k] = value;
            }
          }
        }
      } else if ('values' in data) {
        ref4 = [data.max, data.min], this.max = ref4[0], this.min = ref4[1];
        vec = Transform.jsonToVector(data);
        this.data = Transform.vectorToVolume(vec, [this.x, this.y, this.z]);
      } else {
        this.min = 0;
        this.max = 0;
        this.data = this.empty();
      }
      if ('peaks' in data) {
        ref5 = data.peaks;
        for (u = 0, len = ref5.length; u < len; u++) {
          p = ref5[u];
          this.addSphere(Transform.atlasToImage([p.x, p.y, p.z]), p.r != null ? p.r : p.r = 3, p.value != null ? p.value : p.value = 1);
        }
        this.max = 2;
      }
    }

    Image.prototype.empty = function() {
      var i, j, k, n, q, ref, ref1, ref2, t, vol;
      vol = [];
      for (i = n = 0, ref = this.x; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
        vol[i] = [];
        for (j = q = 0, ref1 = this.y; 0 <= ref1 ? q < ref1 : q > ref1; j = 0 <= ref1 ? ++q : --q) {
          vol[i][j] = [];
          for (k = t = 0, ref2 = this.z; 0 <= ref2 ? t < ref2 : t > ref2; k = 0 <= ref2 ? ++t : --t) {
            vol[i][j][k] = 0;
          }
        }
      }
      return vol;
    };

    Image.prototype.addSphere = function(coords, r, value) {
      var dist, i, j, k, n, q, ref, ref1, ref2, ref3, ref4, ref5, ref6, t, x, y, z;
      if (value == null) {
        value = 1;
      }
      if (r <= 0) {
        return;
      }
      ref = coords.reverse(), x = ref[0], y = ref[1], z = ref[2];
      if (!((x != null) && (y != null) && (z != null))) {
        return;
      }
      for (i = n = ref1 = -r, ref2 = r; ref1 <= ref2 ? n <= ref2 : n >= ref2; i = ref1 <= ref2 ? ++n : --n) {
        if ((x - i) < 0 || (x + i) > (this.x - 1)) {
          continue;
        }
        for (j = q = ref3 = -r, ref4 = r; ref3 <= ref4 ? q <= ref4 : q >= ref4; j = ref3 <= ref4 ? ++q : --q) {
          if ((y - j) < 0 || (y + j) > (this.y - 1)) {
            continue;
          }
          for (k = t = ref5 = -r, ref6 = r; ref5 <= ref6 ? t <= ref6 : t >= ref6; k = ref5 <= ref6 ? ++t : --t) {
            if ((z - k) < 0 || (z + k) > (this.z - 1)) {
              continue;
            }
            dist = i * i + j * j + k * k;
            if (dist < r * r) {
              this.data[i + x][j + y][k + z] = value;
            }
          }
        }
      }
      return false;
    };

    Image.prototype.resample = function(newx, newy, newz) {};

    Image.prototype.slice = function(dim, index) {
      var i, j, n, q, ref, ref1, ref2, slice, t;
      switch (dim) {
        case 0:
          slice = [];
          for (i = n = 0, ref = this.x; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
            slice[i] = [];
            for (j = q = 0, ref1 = this.y; 0 <= ref1 ? q < ref1 : q > ref1; j = 0 <= ref1 ? ++q : --q) {
              slice[i][j] = this.data[i][j][index];
            }
          }
          break;
        case 1:
          slice = [];
          for (i = t = 0, ref2 = this.x; 0 <= ref2 ? t < ref2 : t > ref2; i = 0 <= ref2 ? ++t : --t) {
            slice[i] = this.data[i][index];
          }
          break;
        case 2:
          slice = this.data[index];
      }
      return slice;
    };

    Image.prototype.dims = function() {
      return [this.x, this.y, this.z];
    };

    return Image;

  })();

  Layer = (function() {
    function Layer(image1, options) {
      this.image = image1;
      options = $.extend(true, {
        colorPalette: 'red',
        sign: 'positive',
        visible: true,
        opacity: 1.0,
        cache: false,
        download: false,
        positiveThreshold: 0,
        negativeThreshold: 0,
        description: '',
        intent: 'Value:'
      }, options);
      this.name = options.name;
      this.sign = options.sign;
      this.colorMap = this.setColorMap(options.colorPalette);
      this.visible = options.visible;
      this.threshold = this.setThreshold(options.negativeThreshold, options.positiveThreshold);
      this.opacity = options.opacity;
      this.download = options.download;
      this.intent = options.intent;
      this.description = options.description;
    }

    Layer.prototype.hide = function() {
      return this.visible = false;
    };

    Layer.prototype.show = function() {
      return this.visible = true;
    };

    Layer.prototype.toggle = function() {
      return this.visible = !this.visible;
    };

    Layer.prototype.slice = function(view, viewer) {
      var data;
      data = this.image.slice(view.dim, viewer.coords_ijk[view.dim]);
      data = this.threshold.mask(data);
      return data;
    };

    Layer.prototype.setColorMap = function(palette, steps) {
      var max, maxAbs, min;
      if (palette == null) {
        palette = null;
      }
      if (steps == null) {
        steps = null;
      }
      this.palette = palette;
      if (this.sign === 'both') {

        /* Instead of using the actual min/max range, we find the
        largest absolute value and use that as the bound for
        both signs. This preserves color maps where 0 is
        meaningful; e.g., for hot and cold, we want blues to
        be negative and reds to be positive even when
        abs(min) and abs(max) are quite different.
        BUT if min or max are 0, then implicitly fall back to
        treating mode as if it were 'positive' or 'negative'
         */
        maxAbs = Math.max(this.image.min, this.image.max);
        min = this.image.min === 0 ? 0 : -maxAbs;
        max = this.image.max === 0 ? 0 : maxAbs;
      } else {
        min = this.sign === 'positive' ? 0 : this.image.min;
        max = this.sign === 'negative' ? 0 : this.image.max;
      }
      return this.colorMap = new ColorMap(min, max, palette, steps);
    };

    Layer.prototype.setThreshold = function(negThresh, posThresh) {
      if (negThresh == null) {
        negThresh = 0;
      }
      if (posThresh == null) {
        posThresh = 0;
      }
      return this.threshold = new Threshold(negThresh, posThresh, this.sign);
    };

    Layer.prototype.update = function(settings) {
      var k, nt, pt, v;
      if ('sign' in settings) {
        this.sign = settings['sign'];
      }
      nt = 0;
      pt = 0;
      for (k in settings) {
        v = settings[k];
        switch (k) {
          case 'colorPalette':
            this.setColorMap(v);
            break;
          case 'opacity':
            this.opacity = v;
            break;
          case 'image-intent':
            this.intent = v;
            break;
          case 'pos-threshold':
            pt = v;
            break;
          case 'neg-threshold':
            nt = v;
            break;
          case 'description':
            this.description = v;
        }
      }
      return this.setThreshold(nt, pt, this.sign);
    };

    Layer.prototype.getSettings = function() {
      var nt, pt, settings;
      nt = this.threshold.negThresh;
      pt = this.threshold.posThresh;
      nt || (nt = 0.0);
      pt || (pt = 0.0);
      settings = {
        colorPalette: this.palette,
        sign: this.sign,
        opacity: this.opacity,
        'image-intent': this.intent,
        'pos-threshold': pt,
        'neg-threshold': nt,
        'description': this.description
      };
      return settings;
    };

    return Layer;

  })();

  LayerList = (function() {
    function LayerList() {
      this.clearLayers();
    }

    LayerList.prototype.addLayer = function(layer, activate) {
      if (activate == null) {
        activate = true;
      }
      this.layers.push(layer);
      if (activate) {
        return this.activateLayer(this.layers.length - 1);
      }
    };

    LayerList.prototype.deleteLayer = function(target) {
      var i, index, l, newInd;
      index = String(target).match(/^\d+$/) ? parseInt(target) : index = ((function() {
        var len, n, ref, results;
        ref = this.layers;
        results = [];
        for (i = n = 0, len = ref.length; n < len; i = ++n) {
          l = ref[i];
          if (l.name === target) {
            results.push(i);
          }
        }
        return results;
      }).call(this))[0];
      this.layers.splice(index, 1);
      if ((this.layers.length != null) && (this.activeLayer == null)) {
        newInd = index === 0 ? 1 : index - 1;
        return this.activateLayer(newInd);
      }
    };

    LayerList.prototype.clearLayers = function() {
      this.layers = [];
      return this.activeLayer = null;
    };

    LayerList.prototype.activateLayer = function(index) {
      return this.activeLayer = this.layers[index];
    };

    LayerList.prototype.updateActiveLayer = function(settings) {
      return this.activeLayer.update(settings);
    };

    LayerList.prototype.getLayerNames = function() {
      var l;
      return (function() {
        var len, n, ref, results;
        ref = this.layers;
        results = [];
        for (n = 0, len = ref.length; n < len; n++) {
          l = ref[n];
          results.push(l.name);
        }
        return results;
      }).call(this);
    };

    LayerList.prototype.getLayerVisibilities = function() {
      var l;
      return (function() {
        var len, n, ref, results;
        ref = this.layers;
        results = [];
        for (n = 0, len = ref.length; n < len; n++) {
          l = ref[n];
          results.push(l.visible);
        }
        return results;
      }).call(this);
    };

    LayerList.prototype.getActiveIndex = function() {
      return this.layers.indexOf(this.activeLayer);
    };

    LayerList.prototype.getNextColor = function() {
      var free, l, palettes, used;
      used = (function() {
        var len, n, ref, results;
        ref = this.layers;
        results = [];
        for (n = 0, len = ref.length; n < len; n++) {
          l = ref[n];
          if (l.visible) {
            results.push(l.palette);
          }
        }
        return results;
      }).call(this);
      palettes = Object.keys(ColorMap.PALETTES);
      free = palettes.diff(used);
      if (free.length) {
        return free[0];
      } else {
        return palettes[Math.floor(Math.random() * palettes.length)];
      }
    };

    LayerList.prototype.sortLayers = function(newOrder, destroy, newOnTop) {
      var counter, i, l, len, n, n_layers, n_new, newLayers, ni, ref;
      if (destroy == null) {
        destroy = false;
      }
      if (newOnTop == null) {
        newOnTop = true;
      }
      newLayers = [];
      counter = 0;
      n_layers = this.layers.length;
      n_new = newOrder.length;
      ref = this.layers;
      for (i = n = 0, len = ref.length; n < len; i = ++n) {
        l = ref[i];
        ni = newOrder.indexOf(l.name);
        if (ni < 0) {
          if (destroy) {
            continue;
          } else {
            ni = i;
            if (newOnTop) {
              ni += n_new;
            }
            counter += 1;
          }
        } else if (!(destroy || newOnTop)) {
          ni += counter;
        }
        newLayers[ni] = l;
      }
      return this.layers = newLayers;
    };

    return LayerList;

  })();

  Threshold = (function() {
    function Threshold(negThresh1, posThresh1, sign) {
      this.negThresh = negThresh1;
      this.posThresh = posThresh1;
      this.sign = sign != null ? sign : 'both';
    }

    Threshold.prototype.mask = function(data) {
      var i, n, ref, res;
      if (this.posThresh === 0 && this.negThresh === 0 && this.sign === 'both') {
        return data;
      }
      res = [];
      for (i = n = 0, ref = data.length; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
        res[i] = data[i].map((function(_this) {
          return function(v) {
            if (((_this.negThresh < v && v < _this.posThresh)) || (v < 0 && _this.sign === 'positive') || (v > 0 && _this.sign === 'negative')) {
              return 0;
            } else {
              return v;
            }
          };
        })(this));
      }
      return res;
    };

    return Threshold;

  })();

  Transform = {
    jsonToVector: function(data) {
      var curr_inds, i, j, n, q, ref, ref1, ref2, t, v;
      v = new Array(data.dims[0] * data.dims[1] * data.dims[2]);
      for (i = n = 0, ref = v.length; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
        v[i] = 0;
      }
      for (i = q = 0, ref1 = data.values.length; 0 <= ref1 ? q < ref1 : q > ref1; i = 0 <= ref1 ? ++q : --q) {
        curr_inds = data.indices[i];
        for (j = t = 0, ref2 = curr_inds.length; 0 <= ref2 ? t < ref2 : t > ref2; j = 0 <= ref2 ? ++t : --t) {
          v[curr_inds[j] - 1] = data.values[i];
        }
      }
      return v;
    },
    vectorToVolume: function(vec, dims) {
      var i, j, k, n, q, ref, ref1, ref2, ref3, sliceSize, t, u, vol, x, y, z;
      vol = [];
      for (i = n = 0, ref = dims[0]; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
        vol[i] = [];
        for (j = q = 0, ref1 = dims[1]; 0 <= ref1 ? q < ref1 : q > ref1; j = 0 <= ref1 ? ++q : --q) {
          vol[i][j] = [];
          for (k = t = 0, ref2 = dims[2]; 0 <= ref2 ? t < ref2 : t > ref2; k = 0 <= ref2 ? ++t : --t) {
            vol[i][j][k] = 0;
            sliceSize = dims[1] * dims[2];
          }
        }
      }
      for (i = u = 0, ref3 = vec.length; 0 <= ref3 ? u < ref3 : u > ref3; i = 0 <= ref3 ? ++u : --u) {
        if (typeof vec[i] === undefined) {
          continue;
        }
        x = Math.floor(i / sliceSize);
        y = Math.floor((i - (x * sliceSize)) / dims[2]);
        z = i - (x * sliceSize) - (y * dims[2]);
        vol[x][y][z] = vec[i];
      }
      return vol;
    },
    _transformationMatrix: function(translateXYZ, scaleXYZ) {
      var M, ii, jj, n, row;
      M = [];
      for (ii = n = 0; n <= 2; ii = ++n) {
        row = (function() {
          var q, results;
          results = [];
          for (jj = q = 0; q <= 3; jj = ++q) {
            results.push(0);
          }
          return results;
        })();
        row[ii] = translateXYZ[ii];
        row[3] = scaleXYZ[ii];
        M.push(row);
      }
      console.log(M);
      return M;
    },
    transformCoordinates: function(coords, matrix, round) {
      var m, res, v;
      if (round == null) {
        round = true;
      }
      m = $M(matrix);
      coords = coords.slice(0);
      coords.push(1);
      v = $V(coords);
      res = [];
      m.x(v).each(function(e) {
        if (round) {
          e = Math.round(e);
        }
        return res.push(e);
      });
      return res;
    },
    viewerToAtlas: function(coords) {
      var matrix;
      matrix = this._transformationMatrix([180, -218, -180], [-90, 90, 108]);
      return this.transformCoordinates(coords, matrix);
    },
    atlasToViewer: function(coords) {
      var matrix;
      matrix = this._transformationMatrix([1.0 / 180, -1.0 / 218, 90.0 / 218], [0.5, 90.0 / 218, 108.0 / 180]);
      return this.transformCoordinates(coords, matrix, false);
    },
    atlasToImage: function(coords) {
      var matrix;
      matrix = this._transformationMatrix([-.5, .5, .5], [45, 63, 36]);
      return this.transformCoordinates(coords, matrix);
    },
    imageToAtlas: function(coords) {
      var matrix;
      matrix = this._transformationMatrix([-2, 2, 2], [90, -126, -72]);
      return this.transformCoordinates(coords, matrix);
    }
  };

  UserInterface = (function() {
    function UserInterface(viewer1, layerListId1, layerSettingClass1) {
      this.viewer = viewer1;
      this.layerListId = layerListId1;
      this.layerSettingClass = layerSettingClass1;
      this.viewSettings = this.viewer.viewSettings;
      this.components = {};
      $(this.layerListId).sortable({
        update: (function(_this) {
          return function() {
            var layers, paint;
            layers = ($('.layer_list_item').map(function() {
              return $(this).text();
            })).toArray();
            return _this.viewer.sortLayers(layers, paint = true);
          };
        })(this)
      });
      $(this.layerSettingClass).change((function(_this) {
        return function(e) {
          return _this.settingsChanged();
        };
      })(this));
    }

    UserInterface.prototype.addSlider = function(name, element, orientation, min, max, value, step, textField) {
      var slider;
      slider = new SliderComponent(this, name, element, orientation, min, max, value, step);
      if (textField != null) {
        this.addTextFieldForSlider(textField, slider);
      }
      return this.components[name] = slider;
    };

    UserInterface.prototype.addTextField = function(name, element) {
      var tf;
      tf = new TextFieldComponent(this, name, element);
      return this.components[name] = tf;
    };

    UserInterface.prototype.addTextFieldForSlider = function(element, slider) {
      var name, tf;
      name = slider.name + '_textField';
      tf = new TextFieldComponent(this, name, element, slider);
      return slider.attachTextField(tf);
    };

    UserInterface.prototype.addColorSelect = function(element) {
      return this.components['colorPalette'] = new SelectComponent(this, 'colorPalette', element, Object.keys(ColorMap.PALETTES));
    };

    UserInterface.prototype.addSignSelect = function(element) {
      return this.components['sign'] = new SelectComponent(this, 'signSelect', element, ['both', 'positive', 'negative']);
    };

    UserInterface.prototype.addSettingsCheckboxes = function(element, settings) {
      var checked, s, v, validSettings;
      $(element).empty();
      validSettings = {
        panzoom: 'Pan/zoom',
        crosshairs: 'Crosshairs',
        labels: 'Labels'
      };
      for (s in settings) {
        v = settings[s];
        if (s in validSettings) {
          checked = v ? ' checked' : '';
          $(element).append("<div class='checkbox_row'><input type='checkbox' class='settings_box' " + checked + " id='" + s + "'>" + validSettings[s] + "</div>");
        }
      }
      return $('.settings_box').change((function(_this) {
        return function(e) {
          return _this.checkboxesChanged();
        };
      })(this));
    };

    UserInterface.prototype.settingsChanged = function() {
      var component, name, ref, settings;
      settings = {};
      ref = this.components;
      for (name in ref) {
        component = ref[name];
        settings[name] = component.getValue();
      }
      return this.viewer.updateSettings(settings);
    };

    UserInterface.prototype.checkboxesChanged = function() {
      var id, len, n, ref, s, settings, val;
      settings = {};
      ref = $('.settings_box');
      for (n = 0, len = ref.length; n < len; n++) {
        s = ref[n];
        id = $(s).attr('id');
        val = $(s).is(':checked') ? true : false;
        settings[id + 'Enabled'] = val;
      }
      return this.viewer.updateViewSettings(settings, true);
    };

    UserInterface.prototype.updateComponents = function(settings) {
      var name, results, value;
      results = [];
      for (name in settings) {
        value = settings[name];
        if (name in this.components) {
          results.push(this.components[name].setValue(value));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    UserInterface.prototype.updateThresholdSliders = function(image) {
      if ('pos-threshold' in this.components) {
        this.components['pos-threshold'].setRange(0, image.max);
      }
      if ('neg-threshold' in this.components) {
        return this.components['neg-threshold'].setRange(image.min, 0);
      }
    };

    UserInterface.prototype.updateLayerList = function(layers, selectedIndex) {
      var deletion_icon, download_icon, i, l, n, ref, visibility_icon;
      $(this.layerListId).empty();
      for (i = n = 0, ref = layers.length; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
        l = layers[i];
        visibility_icon = this.viewSettings.visibilityIconEnabled ? "<div class='visibility_icon' title='Hide/show image'><span class='glyphicon glyphicon-eye-open'></i></div>" : '';
        deletion_icon = this.viewSettings.deletionIconEnabled ? "<div class='deletion_icon' title='Remove this layer'><span class='glyphicon glyphicon-trash'></i></div>" : '';
        download_icon = true ? "<div class='download_icon' title='Download this image'><span class='glyphicon glyphicon-save'></i></div>" : '';
        $(this.layerListId).append($(("<li class='layer_list_item'>" + visibility_icon + "<div class='layer_label'>") + l + ("</div>" + download_icon + deletion_icon + "</li>")));
      }
      $('.layer_label').click((function(_this) {
        return function(e) {
          return _this.viewer.selectLayer($('.layer_label').index(e.target));
        };
      })(this));
      $('.visibility_icon').click((function(_this) {
        return function(e) {
          return _this.toggleLayer($('.visibility_icon').index($(e.target).closest('div')));
        };
      })(this));
      $('.deletion_icon').click((function(_this) {
        return function(e) {
          if (confirm("Are you sure you want to remove this layer?")) {
            return _this.viewer.deleteLayer($('.deletion_icon').index($(e.target).closest('div')));
          }
        };
      })(this));
      $('.download_icon').click((function(_this) {
        return function(e) {
          return _this.viewer.downloadImage($('.download_icon').index($(e.target).closest('div')));
        };
      })(this));
      return $(this.layerListId).val(selectedIndex);
    };

    UserInterface.prototype.updateLayerVisibility = function(visible) {
      var i, n, ref, results;
      if (!this.viewSettings.visibilityIconEnabled) {
        return;
      }
      results = [];
      for (i = n = 0, ref = visible.length; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
        if (visible[i]) {
          results.push($('.visibility_icon>span').eq(i).removeClass('glyphicon glyphicon-eye-close').addClass('glyphicon glyphicon-eye-open'));
        } else {
          results.push($('.visibility_icon>span').eq(i).removeClass('glyphicon glyphicon-eye-open').addClass('glyphicon glyphicon-eye-close'));
        }
      }
      return results;
    };

    UserInterface.prototype.updateLayerSelection = function(id) {
      $('.layer_label').eq(id).addClass('selected');
      return $('.layer_label').not(":eq(" + id + ")").removeClass('selected');
    };

    UserInterface.prototype.toggleLayer = function(id) {
      return this.viewer.toggleLayer(id);
    };

    return UserInterface;

  })();

  DataPanel = (function() {
    function DataPanel(viewer1) {
      this.viewer = viewer1;
      this.fields = {};
    }

    DataPanel.prototype.addDataField = function(name, element) {
      return this.fields[name] = new DataField(this, name, element);
    };

    DataPanel.prototype.addCoordinateFields = function(name, element) {
      var i, n, target;
      target = $(element);
      for (i = n = 0; n < 2; i = ++n) {
        target.append($("<div class='axis_pos' id='axis_pos_" + axis + "'></div>"));
      }
      return $('axis_pos').change((function(_this) {
        return function(e) {
          var cc, q;
          for (i = q = 0; q < 2; i = ++q) {
            cc = $("#axis_pos_" + i).val();
            _this.viewer.coords_abc[i] = Transform.atlasToViewer(cc);
            _this.viewer.coords_ijk[i] = cc;
          }
          return _this.viewer.update();
        };
      })(this));
    };

    DataPanel.prototype.update = function(data) {
      var i, k, pos, results, v;
      results = [];
      for (k in data) {
        v = data[k];
        if (k in this.fields) {
          if (k === 'currentCoordsMulti') {
            results.push((function() {
              var results1;
              results1 = [];
              for (pos in v) {
                i = v[pos];
                results1.push($("plane" + i + "_pos").text(pos));
              }
              return results1;
            })());
          } else {
            if (k === 'currentCoords') {
              v = "[" + v + "]";
            }
            results.push($(this.fields[k].element).text(v));
          }
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    return DataPanel;

  })();

  ViewSettings = (function() {

    /* Stores any settings common to all views--e.g., crosshair preferences,
    dragging/zooming, etc. Individual views can override these settings if view-specific
    options are desired.
     */
    function ViewSettings(options) {
      this.settings = {
        panzoomEnabled: false,
        crosshairsEnabled: true,
        crosshairsWidth: 1,
        crosshairsColor: 'lime',
        labelsEnabled: true,
        visibilityIconEnabled: true,
        deletionIconEnabled: true
      };
      this.updateSettings(options);
    }

    ViewSettings.prototype.updateSettings = function(options) {
      var k, ref, v;
      $.extend(this.settings, options);
      ref = this.settings;
      for (k in ref) {
        v = ref[k];
        this[k] = v;
      }
      return this.crosshairs = new Crosshairs(this.crosshairsEnabled, this.crosshairsColor, this.crosshairsWidth);
    };

    return ViewSettings;

  })();

  View = (function() {
    function View(viewer1, viewSettings, element1, dim1, labels1, slider1) {
      this.viewer = viewer1;
      this.viewSettings = viewSettings;
      this.element = element1;
      this.dim = dim1;
      this.labels = labels1 != null ? labels1 : true;
      this.slider = slider1 != null ? slider1 : null;
      this._handleScroll = bind(this._handleScroll, this);
      this._zoom = bind(this._zoom, this);
      this._canvasClick = bind(this._canvasClick, this);
      this.resetCanvas();
      this._jQueryInit();
    }

    View.prototype.addSlider = function(name, element, orientation, min, max, value, step, textField) {
      this.slider = new SliderComponent(this, name, element, orientation, min, max, value, step);
      if (textField != null) {
        return this.viewer.addTextFieldForSlider(textField, this.slider);
      }
    };

    View.prototype.clear = function() {
      var currentState;
      currentState = $.extend(true, {}, this.context.getTransform());
      this.context.reset();
      this.context.fillStyle = 'black';
      this.context.fillRect(0, 0, this.width, this.height);
      return this.context.setTransformFromArray(currentState);
    };

    View.prototype.resetCanvas = function() {
      this.canvas = $(this.element).find('canvas');
      this.width = this.canvas.width();
      this.height = this.canvas.height();
      this.context = this.canvas[0].getContext("2d");
      trackTransforms(this.context);
      this.lastX = this.width / 2;
      this.lastY = this.height / 2;
      this.dragStart = void 0;
      this.scaleFactor = 1.1;
      return this.clear();
    };

    View.prototype.paint = function(layer) {
      var col, cols, data, dims, fuzz, i, img, j, n, q, ref, ref1, val, xCell, xp, yCell, yp;
      if (this.width === 0) {
        this.resetCanvas();
      }
      data = layer.slice(this, this.viewer);
      cols = layer.colorMap.map(data);
      img = layer.image;
      dims = [[img.y, img.z], [img.x, img.z], [img.x, img.y]];
      xCell = this.width / dims[this.dim][0];
      yCell = this.height / dims[this.dim][1];
      this.xCell = xCell;
      this.yCell = yCell;
      fuzz = 0.5;
      this.context.globalAlpha = layer.opacity;
      this.context.lineWidth = 1;
      for (i = n = 0, ref = dims[this.dim][1]; 0 <= ref ? n < ref : n > ref; i = 0 <= ref ? ++n : --n) {
        for (j = q = 0, ref1 = dims[this.dim][0]; 0 <= ref1 ? q < ref1 : q > ref1; j = 0 <= ref1 ? ++q : --q) {
          if (typeof data[i][j] === undefined | data[i][j] === 0) {
            continue;
          }
          xp = this.width - (j + 1) * xCell;
          yp = this.height - (i + 1) * yCell;
          col = cols[i][j];
          this.context.fillStyle = col;
          this.context.fillRect(xp, yp, xCell + fuzz, yCell + fuzz);
        }
      }
      this.context.globalAlpha = 1.0;
      if (this.slider != null) {
        val = this.viewer.coords_abc[this.dim];
        if (this.dim !== Viewer.XAXIS) {
          val = 1 - val;
        }
        return $(this.slider.element).slider('option', 'value', val);
      }
    };

    View.prototype.drawCrosshairs = function() {
      var ch, xPos, yPos;
      ch = this.viewSettings.crosshairs;
      if (!ch.visible) {
        return;
      }
      this.context.fillStyle = ch.color;
      xPos = this.viewer.coords_abc[[1, 0, 0][this.dim]] * this.width;
      yPos = this.viewer.coords_abc[[2, 2, 1][this.dim]] * this.height;
      this.context.fillRect(0, yPos - ch.width / 2, this.width, ch.width);
      return this.context.fillRect(xPos - ch.width / 2, 0, ch.width, this.height);
    };

    View.prototype.drawLabels = function() {
      var fontSize, planePos, planeText;
      if (!this.viewSettings.labelsEnabled) {
        return;
      }
      fontSize = Math.round(this.height / 15);
      this.context.fillStyle = 'white';
      this.context.font = fontSize + "px Helvetica";
      this.context.textAlign = 'left';
      this.context.textBaseline = 'middle';
      planePos = this.viewer.coords_xyz()[this.dim];
      if (planePos > 0) {
        planePos = '+' + planePos;
      }
      planeText = ['x', 'y', 'z'][this.dim] + ' = ' + planePos;
      this.context.fillText(planeText, 0.03 * this.width, 0.95 * this.height);
      this.context.textAlign = 'center';
      switch (this.dim) {
        case 0:
          this.context.fillText('A', 0.05 * this.width, 0.5 * this.height);
          return this.context.fillText('P', 0.95 * this.width, 0.5 * this.height);
        case 1:
          this.context.fillText('D', 0.95 * this.width, 0.05 * this.height);
          return this.context.fillText('V', 0.95 * this.width, 0.95 * this.height);
        case 2:
          this.context.fillText('L', 0.05 * this.width, 0.05 * this.height);
          return this.context.fillText('R', 0.95 * this.width, 0.05 * this.height);
      }
    };

    View.prototype.navSlideChange = function(value) {
      if (this.dim !== Viewer.XAXIS) {
        value = 1 - value;
      }
      return this.viewer.moveToViewerCoords(this.dim, value);
    };

    View.prototype._snapToGrid = function(x, y) {
      var dims, xVoxSize, yVoxSize;
      dims = [91, 109, 91];
      dims.splice(this.dim, 1);
      xVoxSize = 1 / dims[0];
      yVoxSize = 1 / dims[1];
      x = (Math.floor(x / xVoxSize) + 0.5) * xVoxSize;
      y = (Math.floor(y / yVoxSize) + 0.5) * yVoxSize;
      return {
        x: x,
        y: y
      };
    };

    View.prototype._jQueryInit = function() {
      var canvas;
      canvas = $(this.element).find('canvas');
      canvas.click(this._canvasClick);
      canvas.mousedown((function(_this) {
        return function(evt) {
          document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = "none";
          _this.lastX = evt.offsetX || (evt.pageX - canvas.offset().left);
          _this.lastY = evt.offsetY || (evt.pageY - canvas.offset().top);
          return _this.dragStart = _this.context.transformedPoint(_this.lastX, _this.lastY);
        };
      })(this));
      canvas.mousemove((function(_this) {
        return function(evt) {
          var pt;
          if (!_this.viewSettings.panzoomEnabled) {
            return;
          }
          _this.lastX = evt.offsetX || (evt.pageX - canvas.offset().left);
          _this.lastY = evt.offsetY || (evt.pageY - canvas.offset().top);
          if (_this.dragStart) {
            pt = _this.context.transformedPoint(_this.lastX, _this.lastY);
            _this.context.translate(pt.x - _this.dragStart.x, pt.y - _this.dragStart.y);
            return _this.viewer.paint();
          }
        };
      })(this));
      canvas.mouseup((function(_this) {
        return function(evt) {
          return _this.dragStart = null;
        };
      })(this));
      canvas.on("DOMMouseScroll", this._handleScroll);
      return canvas.on("mousewheel", this._handleScroll);
    };

    View.prototype._canvasClick = function(e) {
      var clickX, clickY, cx, cy, pt;
      $(this.viewer).trigger('beforeClick');
      clickX = e.offsetX || (e.pageX - $(this.element).offset().left);
      clickY = e.offsetY || (e.pageY - $(this.element).offset().top);
      pt = this.context.transformedPoint(clickX, clickY);
      cx = pt.x / this.width;
      cy = pt.y / this.height;
      pt = this._snapToGrid(cx, cy);
      this.viewer.moveToViewerCoords(this.dim, pt.x, pt.y);
      return $(this.viewer).trigger('afterClick');
    };

    View.prototype._zoom = function(clicks) {
      var factor, pt;
      if (!this.viewSettings.panzoomEnabled) {
        return;
      }
      pt = this.context.transformedPoint(this.lastX, this.lastY);
      this.context.translate(pt.x, pt.y);
      factor = Math.pow(this.scaleFactor, clicks);
      this.context.scale(factor, factor);
      this.context.translate(-pt.x, -pt.y);
      return this.viewer.paint();
    };

    View.prototype._handleScroll = function(evt) {
      var delta, oe;
      oe = evt.originalEvent;
      delta = (oe.wheelDelta ? oe.wheelDelta / 40 : (oe.detail ? -oe.detail : 0));
      if (delta) {
        this._zoom(delta);
      }
      return evt.preventDefault() && false;
    };

    return View;

  })();

  Crosshairs = (function() {
    function Crosshairs(visible1, color, width) {
      this.visible = visible1 != null ? visible1 : true;
      this.color = color != null ? color : 'lime';
      this.width = width != null ? width : 1;
    }

    return Crosshairs;

  })();

  ColorMap = (function() {
    var basic, col, len, n;

    ColorMap.PALETTES = {
      grayscale: ['#000000', '#303030', 'gray', 'silver', 'white']
    };

    basic = ['red', 'green', 'blue', 'yellow', 'purple', 'lime', 'aqua', 'navy'];

    for (n = 0, len = basic.length; n < len; n++) {
      col = basic[n];
      ColorMap.PALETTES[col] = ['black', col, 'white'];
    }

    $.extend(ColorMap.PALETTES, {
      'intense red-blue': ['#053061', '#2166AC', '#4393C3', '#F7F7F7', '#D6604D', '#B2182B', '#67001F'],
      'red-yellow-blue': ['#313695', '#4575B4', '#74ADD1', '#FFFFBF', '#F46D43', '#D73027', '#A50026'],
      'brown-teal': ['#003C30', '#01665E', '#35978F', '#F5F5F5', '#BF812D', '#8C510A', '#543005']
    });

    function ColorMap(min1, max1, palette1, steps1) {
      this.min = min1;
      this.max = max1;
      this.palette = palette1 != null ? palette1 : 'hot and cold';
      this.steps = steps1 != null ? steps1 : 40;
      this.range = this.max - this.min;
      this.colors = this.setColors(ColorMap.PALETTES[this.palette]);
    }

    ColorMap.prototype.map = function(data) {
      var i, q, ref, res;
      res = [];
      for (i = q = 0, ref = data.length; 0 <= ref ? q < ref : q > ref; i = 0 <= ref ? ++q : --q) {
        res[i] = data[i].map((function(_this) {
          return function(v) {
            return _this.colors[Math.floor(((v - _this.min) / _this.range) * _this.steps)];
          };
        })(this));
      }
      return res;
    };

    ColorMap.prototype.setColors = function(colors) {
      var i, q, rainbow, ref;
      rainbow = new Rainbow();
      rainbow.setNumberRange(1, this.steps);
      rainbow.setSpectrum.apply(null, colors);
      colors = [];
      for (i = q = 1, ref = this.steps; 1 <= ref ? q < ref : q > ref; i = 1 <= ref ? ++q : --q) {
        colors.push(rainbow.colourAt(i));
      }
      return colors.map(function(c) {
        return "#" + c;
      });
    };

    return ColorMap;

  })();

  Component = (function() {
    function Component(container, name1, element1) {
      this.container = container;
      this.name = name1;
      this.element = element1;
      $(this.element).change((function(_this) {
        return function(e) {
          return _this.container.settingsChanged();
        };
      })(this));
    }

    Component.prototype.getValue = function() {
      return $(this.element).val();
    };

    Component.prototype.setValue = function(value) {
      return $(this.element).val(value);
    };

    Component.prototype.setEnabled = function(status) {
      status = status ? '' : 'disabled';
      return $(this.element).attr('disabled', status);
    };

    return Component;

  })();

  SliderComponent = (function(superClass) {
    extend(SliderComponent, superClass);

    function SliderComponent(container, name1, element1, orientation1, min1, max1, value1, step1) {
      this.container = container;
      this.name = name1;
      this.element = element1;
      this.orientation = orientation1;
      this.min = min1;
      this.max = max1;
      this.value = value1;
      this.step = step1;
      this.change = bind(this.change, this);
      this.range = this.name.match(/threshold/g) ? 'max' : this.name.match(/nav/g) ? false : 'min';
      this._jQueryInit();
    }

    SliderComponent.prototype.change = function(e, ui) {
      if (this.name.match(/nav/g)) {
        this.container.navSlideChange(ui.value);
      } else {
        this.container.settingsChanged(e);
      }
      return e.stopPropagation();
    };

    SliderComponent.prototype._jQueryInit = function() {
      return $(this.element).slider({
        orientation: this.orientation,
        range: this.range,
        min: this.min,
        max: this.max,
        step: this.step,
        slide: this.change,
        value: this.value
      });
    };

    SliderComponent.prototype.getValue = function() {
      return $(this.element).slider('value');
    };

    SliderComponent.prototype.setValue = function(value) {
      $(this.element).slider('value', value);
      if (this.textField != null) {
        return this.textField.setValue(value);
      }
    };

    SliderComponent.prototype.setRange = function(min1, max1) {
      this.min = min1;
      this.max = max1;
      return $(this.element).slider('option', {
        min: this.min,
        max: this.max
      });
    };

    SliderComponent.prototype.attachTextField = function(textField1) {
      this.textField = textField1;
    };

    return SliderComponent;

  })(Component);

  SelectComponent = (function(superClass) {
    extend(SelectComponent, superClass);

    function SelectComponent(container, name1, element1, options) {
      var len, n, o;
      this.container = container;
      this.name = name1;
      this.element = element1;
      $(this.element).empty();
      for (n = 0, len = options.length; n < len; n++) {
        o = options[n];
        $(this.element).append($('<option></option>').text(o).val(o));
      }
      SelectComponent.__super__.constructor.call(this, this.container, this.name, this.element);
    }

    return SelectComponent;

  })(Component);

  TextFieldComponent = (function(superClass) {
    extend(TextFieldComponent, superClass);

    function TextFieldComponent(container, name1, element1, slider1) {
      this.container = container;
      this.name = name1;
      this.element = element1;
      this.slider = slider1 != null ? slider1 : null;
      if (this.slider != null) {
        this.setValue(this.slider.getValue());
        $(this.element).change((function(_this) {
          return function(e) {
            var v;
            v = _this.getValue();
            if ($.isNumeric(v)) {
              if (v < _this.slider.min) {
                v = _this.slider.min;
              } else if (v > _this.slider.max) {
                v = _this.slider.max;
              }
              _this.setValue(v);
              _this.slider.setValue(v);
              return _this.container.settingsChanged(e);
            }
          };
        })(this));
        $(this.slider.element).on('slide', (function(_this) {
          return function(e) {
            _this.setValue(_this.slider.getValue());
            return e.stopPropagation();
          };
        })(this));
      }
    }

    TextFieldComponent.prototype.setValue = function(value) {
      $(this.element).val(value);
      return $(this.element).text(value);
    };

    return TextFieldComponent;

  })(Component);

  DataField = (function() {
    function DataField(panel, name1, element1) {
      this.panel = panel;
      this.name = name1;
      this.element = element1;
    }

    return DataField;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5jb2ZmZWUiLCJtb2RlbHMuY29mZmVlIiwidmlld3MuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBO0FBQUEsTUFBQSxxTUFBQTtJQUFBOzs7OztFQUFBLE1BQUEsQ0FBQSxXQUFBLE1BQUEsQ0FBQSxTQUFBOzs7QUFFQTs7RUFHQSxNQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQSxPQUFBLElBQUEsU0FBQSxLQUFBO0FBQUEsV0FBQSxFQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQTtFQUFBOztFQUVBLEtBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxHQUFBLFNBQUEsQ0FBQTtXQUNBLElBQUEsQ0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBO2FBQ0EsQ0FBQSxDQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0lBREEsQ0FBQTtFQURBOztFQVNBLE1BQUEsQ0FBQSxNQUFBLEdBQUE7SUFHQSxNQUFBLENBQUEsS0FBQSxHQUFBOztJQUNBLE1BQUEsQ0FBQSxPQUFBLEdBQUE7O0lBQ0EsTUFBQSxDQUFBLFFBQUEsR0FBQTs7SUFDQSxNQUFBLENBQUEsS0FBQSxHQUFBOztJQUNBLE1BQUEsQ0FBQSxLQUFBLEdBQUE7O0lBQ0EsTUFBQSxDQUFBLEtBQUEsR0FBQTs7SUFFQSxnQkFBQSxXQUFBLEVBQUEsaUJBQUEsRUFBQSxLQUFBLEVBQUEsT0FBQTtBQUVBLFVBQUE7TUFGQSxJQUFBLENBQUEsd0JBQUEsUUFBQTs7UUFBQSxVQUFBOztNQUVBLEdBQUEsR0FBQSxLQUFBLElBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUE7TUFHQSxJQUFBLENBQUEsVUFBQSxHQUFBLFNBQUEsQ0FBQSxZQUFBLENBQUEsR0FBQTtNQUNBLElBQUEsQ0FBQSxVQUFBLEdBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxHQUFBO01BQ0EsSUFBQSxDQUFBLFlBQUEsR0FBQSxJQUFBLFlBQUEsQ0FBQSxPQUFBO01BQ0EsSUFBQSxDQUFBLEtBQUEsR0FBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLEdBQUE7TUFDQSxJQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsU0FBQSxDQUFBLElBQUE7TUFDQSxJQUFBLENBQUEsU0FBQSxHQUFBLElBQUEsU0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLGFBQUEsR0FBQSxJQUFBLGFBQUEsQ0FBQSxJQUFBLEVBQUEsV0FBQSxFQUFBLGlCQUFBO01BQ0EsSUFBQSxJQUFBLENBQUEsS0FBQSxJQUFBLG9EQUFBO1FBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQSxPQUFBLENBQUEsTUFBQTs7SUFiQTs7cUJBbUJBLFVBQUEsR0FBQSxTQUFBO0FBQ0EsYUFBQSxTQUFBLENBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBO0lBREE7O3FCQUdBLEtBQUEsR0FBQSxTQUFBO0FBQ0EsVUFBQTtNQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsYUFBQTtNQUNBLElBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBO1FBQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxzQkFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLEtBQUE7UUFDQSxJQUFBLENBQUEsaUJBQUEsQ0FBQSxFQUZBOztBQUdBO0FBQUEsV0FBQSxxQ0FBQTs7UUFDQSxDQUFBLENBQUEsS0FBQSxDQUFBO0FBR0E7QUFBQSxhQUFBLHdDQUFBOztVQUNBLElBQUEsQ0FBQSxDQUFBLE9BQUE7WUFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTs7QUFEQTtRQUVBLENBQUEsQ0FBQSxjQUFBLENBQUE7UUFDQSxDQUFBLENBQUEsVUFBQSxDQUFBO0FBUEE7TUFRQSxDQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLGFBQUE7QUFDQSxhQUFBO0lBZEE7O3FCQWlCQSxLQUFBLEdBQUEsU0FBQTtBQUNBLFVBQUE7QUFBQTtBQUFBO1dBQUEscUNBQUE7O3FCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUE7QUFBQTs7SUFEQTs7cUJBSUEsV0FBQSxHQUFBLFNBQUE7QUFDQSxVQUFBO0FBQUE7QUFBQTtXQUFBLHFDQUFBOztxQkFBQSxDQUFBLENBQUEsV0FBQSxDQUFBO0FBQUE7O0lBREE7O3FCQUlBLE9BQUEsR0FBQSxTQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUE7O1FBQUEsU0FBQTs7YUFDQSxJQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLENBQUE7SUFEQTs7cUJBSUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxXQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxTQUFBO0FBQ0EsVUFBQTs7UUFEQSxNQUFBOzs7UUFBQSxZQUFBOztNQUNBLElBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUE7UUFFQSxLQUFBOztBQUFBO0FBQUE7ZUFBQSxxQ0FBQTs7Z0JBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQTsyQkFBQTs7QUFBQTs7O0FBQ0E7YUFBQSx1Q0FBQTs7dUJBQ0EsQ0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLFdBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsU0FBQTtBQURBO3VCQUhBO09BQUEsTUFBQTtlQU1BLElBQUEsQ0FBQSxhQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsV0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxTQUFBLEVBTkE7O0lBREE7O3FCQVNBLFlBQUEsR0FBQSxTQUFBLElBQUEsRUFBQSxPQUFBO2FBQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxZQUFBLENBQUEsSUFBQSxFQUFBLE9BQUE7SUFEQTs7cUJBR0EsWUFBQSxHQUFBLFNBQUEsSUFBQSxFQUFBLE9BQUE7YUFDQSxJQUFBLENBQUEsU0FBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLEVBQUEsT0FBQTtJQURBOztxQkFHQSxvQkFBQSxHQUFBLFNBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBO2FBQ0EsSUFBQSxDQUFBLFNBQUEsQ0FBQSxvQkFBQSxDQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsR0FBQTtJQURBOztxQkFJQSxjQUFBLEdBQUEsU0FBQSxPQUFBO2FBQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxjQUFBLENBQUEsT0FBQTtJQURBOztxQkFJQSxhQUFBLEdBQUEsU0FBQSxPQUFBO2FBQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxhQUFBLENBQUEsT0FBQTtJQURBOztxQkFRQSxxQkFBQSxHQUFBLFNBQUEsT0FBQSxFQUFBLE9BQUE7QUFDQSxVQUFBO01BQUEsSUFBQSxPQUFBLEtBQUEsVUFBQTtRQUFBLE9BQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBOztNQUNBLFFBQUEsR0FBQTtNQUNBLE9BQUE7O0FBQUE7YUFBQSx5Q0FBQTs7Y0FBQSxDQUFBLEtBQUEsWUFBQSxJQUFBLENBQUEsS0FBQSxTQUFBLElBQUEsQ0FBQSxLQUFBO3lCQUFBOztBQUFBOzs7QUFDQSxXQUFBLHlDQUFBOztRQUNBLFFBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLENBQUEsR0FBQSxTQUFBO0FBREE7YUFFQSxJQUFBLENBQUEsYUFBQSxDQUFBLHFCQUFBLENBQUEsT0FBQSxFQUFBLFFBQUE7SUFOQTs7cUJBU0EsVUFBQSxHQUFBLFNBQUEsSUFBQSxFQUFBLE9BQUE7QUFDQSxVQUFBO01BQUEsS0FBQSxHQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxFQUFBLE9BQUE7TUFDQSxJQUFBLENBQUEsU0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBO0FBQ0E7UUFDQSxJQUFBLElBQUEsQ0FBQSxLQUFBLElBQUEsT0FBQSxDQUFBLEtBQUE7aUJBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtTQURBO09BQUEsY0FBQTtRQUVBO2VBQ0EsR0FIQTs7SUFIQTs7cUJBU0Esa0JBQUEsR0FBQSxTQUFBLE9BQUE7QUFDQSxhQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUEsSUFBQTtpQkFDQSxLQUFBLENBQUEsVUFBQSxDQUFBLElBQUEsRUFBQSxPQUFBO1FBREE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUE7SUFEQTs7cUJBTUEsb0JBQUEsR0FBQSxTQUFBLE9BQUE7QUFDQSxVQUFBO01BQUEsR0FBQSxHQUFBLENBQUEsQ0FBQSxRQUFBLENBQUE7TUFHQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsTUFBQSxDQUFBLGlEQUFBO01BQ0EsQ0FBQSxHQUFBLElBQUEsQ0FBQSxDQUFBLFVBQUEsQ0FBQTtNQUNBLENBQUEsQ0FBQSxTQUFBLEdBQUE7TUFDQSxDQUFBLENBQUEsV0FBQSxHQUFBO01BQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQTtNQUVBLENBQUEsQ0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBLGdCQUFBLEdBQUE7TUFDQSxDQUFBLENBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxtQkFBQSxHQUFBO01BQ0EsQ0FBQSxDQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsa0JBQUEsR0FBQTtNQUNBLENBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBO01BR0EsQ0FBQSxHQUFBLElBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQTtNQUVBLENBQUEsQ0FBQSxJQUFBLEdBQUEsT0FBQSxDQUFBLEdBQUEsR0FBQTtNQUNBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtNQUNBLENBQUEsQ0FBQSxNQUFBLENBQUE7TUFDQSxDQUFBLENBQUEsVUFBQSxHQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtBQUNBLGNBQUE7VUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBO1VBQ0EsSUFBQSxHQUFBO1lBQ0EsTUFBQSxFQUFBLENBQUEsQ0FBQSxLQURBO1lBRUEsSUFBQSxFQUFBLENBQUEsQ0FBQSxVQUZBOztVQUlBLEtBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxFQUFBLE9BQUE7VUFDQSxDQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsTUFBQSxDQUFBO2lCQUNBLEdBQUEsQ0FBQSxPQUFBLENBQUEsOEJBQUE7UUFSQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7QUFTQSxhQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUE7SUE5QkE7O3FCQWlDQSxVQUFBLEdBQUEsU0FBQSxNQUFBLEVBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQTs7UUFEQSxXQUFBOzs7UUFBQSxRQUFBOzs7UUFBQSxlQUFBOzs7QUFDQTs7Ozs7TUFNQSxJQUFBLENBQUEsV0FBQSxDQUFBLE1BQUEsQ0FBQTtRQUNBLE1BQUEsR0FBQSxDQUFBLE1BQUEsRUFEQTs7TUFHQSxRQUFBLEdBQUE7TUFLQSxjQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUE7TUFDQSxNQUFBOztBQUFBO2FBQUEsd0NBQUE7O29CQUFBLEdBQUEsQ0FBQSxJQUFBLEVBQUEsYUFBQSxjQUFBLEVBQUEsR0FBQTt5QkFBQTs7QUFBQTs7O0FBRUEsV0FBQSx3Q0FBQTs7UUFFQSxJQUFBLFlBQUEsSUFBQSwwQkFBQTtVQUNBLEdBQUEsQ0FBQSxZQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxZQUFBLENBQUEsRUFEQTs7UUFJQSxJQUFBLENBQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLElBQUEsQ0FBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQTtVQUNBLElBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsRUFEQTtTQUFBLE1BSUEsSUFBQSxHQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxHQUFBLENBQUEsSUFBQTtVQUNBLFFBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLGtCQUFBLENBQUEsR0FBQSxDQUFBLEVBREE7U0FBQSxNQUFBO1VBSUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsb0JBQUEsQ0FBQSxHQUFBLENBQUEsRUFKQTs7QUFWQTthQWlCQSxDQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtBQUNBLGNBQUE7VUFBQSxLQUFBOztBQUFBO2lCQUFBLDBDQUFBOzsyQkFBQSxDQUFBLENBQUE7QUFBQTs7O1VBQ0EsS0FBQSxDQUFBLFVBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLENBQUE7VUFDQSxLQUFBLENBQUEsV0FBQSxvQkFBQSxXQUFBLFdBQUEsQ0FBQTtVQUNBLEtBQUEsQ0FBQSxtQkFBQSxDQUFBO2lCQUNBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQTtRQUxBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBO0lBbkNBOztxQkE0Q0EsV0FBQSxHQUFBLFNBQUE7TUFDQSxJQUFBLENBQUEsU0FBQSxDQUFBLFdBQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxtQkFBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsZUFBQTtJQUpBOztxQkFPQSxhQUFBLEdBQUEsU0FBQSxLQUFBO0FBQ0EsVUFBQTtNQUFBLEdBQUEsR0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtNQUNBLElBQUEsR0FBQTtlQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsRUFBQTs7SUFGQTs7cUJBS0EsV0FBQSxHQUFBLFNBQUEsS0FBQTtNQUNBLElBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLEtBQUE7TUFDQSxJQUFBLENBQUEsYUFBQSxDQUFBLG9CQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxpQkFBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxzQkFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLEtBQUE7TUFDQSxJQUFBLENBQUEsYUFBQSxDQUFBLGdCQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxXQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLGVBQUE7SUFOQTs7cUJBU0EsV0FBQSxHQUFBLFNBQUEsTUFBQTtNQUNBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLE1BQUE7TUFDQSxJQUFBLENBQUEsbUJBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQTtJQUhBOztxQkFNQSxXQUFBLEdBQUEsU0FBQSxLQUFBO01BQ0EsSUFBQSxDQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxxQkFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsY0FBQTtJQUpBOztxQkFPQSxVQUFBLEdBQUEsU0FBQSxNQUFBLEVBQUEsS0FBQTs7UUFBQSxRQUFBOztNQUNBLElBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxDQUFBLE1BQUE7TUFDQSxJQUFBLENBQUEsYUFBQSxDQUFBLHFCQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxvQkFBQSxDQUFBLENBQUE7TUFDQSxJQUFBLEtBQUE7ZUFBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEVBQUE7O0lBSEE7O3FCQU9BLG1CQUFBLEdBQUEsU0FBQTtNQUNBLElBQUEsQ0FBQSxhQUFBLENBQUEsZUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLENBQUEsRUFBQSxJQUFBLENBQUEsU0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxxQkFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsb0JBQUEsQ0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxvQkFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxDQUFBLENBQUE7TUFDQSxJQUFBLGtDQUFBO1FBQ0EsSUFBQSxDQUFBLGFBQUEsQ0FBQSxnQkFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLEVBREE7O2FBRUEsSUFBQSxDQUFBLEtBQUEsQ0FBQTtJQU5BOztxQkFTQSxjQUFBLEdBQUEsU0FBQSxRQUFBO01BQ0EsSUFBQSxDQUFBLFNBQUEsQ0FBQSxpQkFBQSxDQUFBLFFBQUE7YUFDQSxJQUFBLENBQUEsS0FBQSxDQUFBO0lBRkE7O3FCQUtBLGlCQUFBLEdBQUEsU0FBQTtBQUVBLFVBQUE7TUFBQSxXQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtNQUNBLE1BQUEsSUFBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsVUFBQSxFQUFBO01BQ0EsWUFBQSxHQUFBLFdBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxhQUFBLEdBQUEsU0FBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxJQUFBO01BRUEsSUFBQSxHQUNBO1FBQUEsVUFBQSxFQUFBLFlBQUE7UUFDQSxhQUFBLEVBQUEsYUFEQTs7YUFHQSxJQUFBLENBQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBO0lBWEE7O3FCQWNBLGtCQUFBLEdBQUEsU0FBQSxPQUFBLEVBQUEsS0FBQTs7UUFBQSxRQUFBOztNQUNBLElBQUEsQ0FBQSxZQUFBLENBQUEsY0FBQSxDQUFBLE9BQUE7TUFDQSxJQUFBLEtBQUE7ZUFBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEVBQUE7O0lBRkE7O3FCQU1BLGtCQUFBLEdBQUEsU0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUE7QUFHQSxVQUFBOztRQUhBLEtBQUE7O01BR0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxzQkFBQTtNQUNBLElBQUEsVUFBQTtRQUNBLElBQUEsR0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBO1FBQ0EsSUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxFQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsR0FBQSxDQUFBLEVBRkE7T0FBQSxNQUFBO1FBSUEsSUFBQSxHQUFBLElBQUEsQ0FBQTtRQUNBLElBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxHQUxBOztNQU1BLElBQUEsQ0FBQSxVQUFBLEdBQUE7TUFDQSxJQUFBLENBQUEsVUFBQSxHQUFBLFNBQUEsQ0FBQSxZQUFBLENBQUEsU0FBQSxDQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEscUJBQUE7SUFiQTs7cUJBZ0JBLGlCQUFBLEdBQUEsU0FBQSxNQUFBLEVBQUEsS0FBQTs7UUFBQSxRQUFBOztNQUNBLElBQUEsQ0FBQSxVQUFBLEdBQUEsU0FBQSxDQUFBLFlBQUEsQ0FBQSxNQUFBO01BQ0EsSUFBQSxDQUFBLFVBQUEsR0FBQSxTQUFBLENBQUEsYUFBQSxDQUFBLE1BQUE7TUFDQSxJQUFBLEtBQUE7ZUFBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEVBQUE7O0lBSEE7O3FCQU1BLFVBQUEsR0FBQSxTQUFBLEtBQUE7YUFDQSxJQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtJQURBOztxQkFJQSxVQUFBLEdBQUEsU0FBQTthQUNBLElBQUEsQ0FBQSxhQUFBLENBQUEsVUFBQSxDQUFBO0lBREE7Ozs7OztFQ3RUQTtJQUVBLGVBQUEsSUFBQTtBQUdBLFVBQUE7TUFBQSxNQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsSUFBQSxDQUFBLFVBQUEsRUFBQSxJQUFBLENBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQTtNQUtBLElBQUEsUUFBQSxJQUFBLElBQUE7UUFDQSxJQUFBLENBQUEsR0FBQSxHQUFBO1FBQ0EsSUFBQSxDQUFBLEdBQUEsR0FBQTtRQUNBLElBQUEsQ0FBQSxJQUFBLEdBQUE7QUFDQSxhQUFBLG9GQUFBO1VBQ0EsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQTtBQUNBLGVBQUEsb0ZBQUE7WUFDQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO0FBQ0EsaUJBQUEsb0ZBQUE7Y0FDQSxLQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBO2NBQ0EsSUFBQSxLQUFBLEdBQUEsSUFBQSxDQUFBLEdBQUE7Z0JBQUEsSUFBQSxDQUFBLEdBQUEsR0FBQSxNQUFBOztjQUNBLElBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQSxHQUFBO2dCQUFBLElBQUEsQ0FBQSxHQUFBLEdBQUEsTUFBQTs7Y0FDQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO0FBSkE7QUFGQTtBQUZBLFNBSkE7T0FBQSxNQWVBLElBQUEsUUFBQSxJQUFBLElBQUE7UUFDQSxPQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsSUFBQSxDQUFBLGFBQUEsRUFBQSxJQUFBLENBQUE7UUFDQSxHQUFBLEdBQUEsU0FBQSxDQUFBLFlBQUEsQ0FBQSxJQUFBO1FBQ0EsSUFBQSxDQUFBLElBQUEsR0FBQSxTQUFBLENBQUEsY0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLEVBQUEsSUFBQSxDQUFBLENBQUEsRUFBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLEVBSEE7T0FBQSxNQUFBO1FBT0EsSUFBQSxDQUFBLEdBQUEsR0FBQTtRQUNBLElBQUEsQ0FBQSxHQUFBLEdBQUE7UUFDQSxJQUFBLENBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsRUFUQTs7TUFZQSxJQUFBLE9BQUEsSUFBQSxJQUFBO0FBQ0E7QUFBQSxhQUFBLHNDQUFBOztVQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsU0FBQSxDQUFBLFlBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsZ0JBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxvQkFBQSxDQUFBLENBQUEsUUFBQSxDQUFBLENBQUEsUUFBQSxDQUFBO0FBQUE7UUFDQSxJQUFBLENBQUEsR0FBQSxHQUFBLEVBRkE7O0lBbkNBOztvQkEwQ0EsS0FBQSxHQUFBLFNBQUE7QUFDQSxVQUFBO01BQUEsR0FBQSxHQUFBO0FBQ0EsV0FBQSwrRUFBQTtRQUNBLEdBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQTtBQUNBLGFBQUEsb0ZBQUE7VUFDQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUE7QUFDQSxlQUFBLG9GQUFBO1lBQ0EsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO0FBREE7QUFGQTtBQUZBO0FBTUEsYUFBQTtJQVJBOztvQkFjQSxTQUFBLEdBQUEsU0FBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEtBQUE7QUFDQSxVQUFBOztRQURBLFFBQUE7O01BQ0EsSUFBQSxDQUFBLElBQUEsQ0FBQTtBQUFBLGVBQUE7O01BQ0EsTUFBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsRUFBQSxVQUFBLEVBQUEsVUFBQSxFQUFBO01BQ0EsSUFBQSxDQUFBLENBQUEsV0FBQSxJQUFBLFdBQUEsSUFBQSxXQUFBLENBQUE7QUFBQSxlQUFBOztBQUNBLFdBQUEsK0ZBQUE7UUFDQSxJQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQUEsbUJBQUE7O0FBQ0EsYUFBQSwrRkFBQTtVQUNBLElBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUE7QUFBQSxxQkFBQTs7QUFDQSxlQUFBLCtGQUFBO1lBQ0EsSUFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUFBLHVCQUFBOztZQUNBLElBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQSxHQUFBO1lBQ0EsSUFBQSxJQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUE7Y0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLE1BQUE7O0FBSEE7QUFGQTtBQUZBO0FBUUEsYUFBQTtJQVpBOztvQkFnQkEsUUFBQSxHQUFBLFNBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEdBQUE7O29CQUtBLEtBQUEsR0FBQSxTQUFBLEdBQUEsRUFBQSxLQUFBO0FBQ0EsVUFBQTtBQUFBLGNBQUEsR0FBQTtBQUFBLGFBQ0EsQ0FEQTtVQUVBLEtBQUEsR0FBQTtBQUNBLGVBQUEsK0VBQUE7WUFDQSxLQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUE7QUFDQSxpQkFBQSxvRkFBQTtjQUNBLEtBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUE7QUFEQTtBQUZBO0FBRkE7QUFEQSxhQU9BLENBUEE7VUFRQSxLQUFBLEdBQUE7QUFDQSxlQUFBLG9GQUFBO1lBQ0EsS0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQTtBQURBO0FBRkE7QUFQQSxhQVdBLENBWEE7VUFZQSxLQUFBLEdBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBO0FBWkE7QUFhQSxhQUFBO0lBZEE7O29CQWdCQSxJQUFBLEdBQUEsU0FBQTtBQUNBLGFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxFQUFBLElBQUEsQ0FBQSxDQUFBLEVBQUEsSUFBQSxDQUFBLENBQUE7SUFEQTs7Ozs7O0VBS0E7SUFNQSxlQUFBLE1BQUEsRUFBQSxPQUFBO01BQUEsSUFBQSxDQUFBLFFBQUE7TUFHQSxPQUFBLEdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUE7UUFDQSxZQUFBLEVBQUEsS0FEQTtRQUVBLElBQUEsRUFBQSxVQUZBO1FBR0EsT0FBQSxFQUFBLElBSEE7UUFJQSxPQUFBLEVBQUEsR0FKQTtRQUtBLEtBQUEsRUFBQSxLQUxBO1FBTUEsUUFBQSxFQUFBLEtBTkE7UUFPQSxpQkFBQSxFQUFBLENBUEE7UUFRQSxpQkFBQSxFQUFBLENBUkE7UUFTQSxXQUFBLEVBQUEsRUFUQTtRQVVBLE1BQUEsRUFBQSxRQVZBO09BQUEsRUFXQSxPQVhBO01BYUEsSUFBQSxDQUFBLElBQUEsR0FBQSxPQUFBLENBQUE7TUFDQSxJQUFBLENBQUEsSUFBQSxHQUFBLE9BQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxRQUFBLEdBQUEsSUFBQSxDQUFBLFdBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLFNBQUEsR0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLE9BQUEsQ0FBQSxpQkFBQSxFQUFBLE9BQUEsQ0FBQSxpQkFBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLFFBQUEsR0FBQSxPQUFBLENBQUE7TUFDQSxJQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxXQUFBLEdBQUEsT0FBQSxDQUFBO0lBeEJBOztvQkEyQkEsSUFBQSxHQUFBLFNBQUE7YUFDQSxJQUFBLENBQUEsT0FBQSxHQUFBO0lBREE7O29CQUlBLElBQUEsR0FBQSxTQUFBO2FBQ0EsSUFBQSxDQUFBLE9BQUEsR0FBQTtJQURBOztvQkFJQSxNQUFBLEdBQUEsU0FBQTthQUNBLElBQUEsQ0FBQSxPQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUE7SUFEQTs7b0JBSUEsS0FBQSxHQUFBLFNBQUEsSUFBQSxFQUFBLE1BQUE7QUFFQSxVQUFBO01BQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBO01BRUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7QUFDQSxhQUFBO0lBTEE7O29CQVFBLFdBQUEsR0FBQSxTQUFBLE9BQUEsRUFBQSxLQUFBO0FBQ0EsVUFBQTs7UUFEQSxVQUFBOzs7UUFBQSxRQUFBOztNQUNBLElBQUEsQ0FBQSxPQUFBLEdBQUE7TUFHQSxJQUFBLElBQUEsQ0FBQSxJQUFBLEtBQUEsTUFBQTs7QUFDQTs7Ozs7Ozs7O1FBUUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBO1FBQ0EsR0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQTtRQUNBLEdBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxHQUFBLE9BWEE7T0FBQSxNQUFBO1FBZUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxJQUFBLEtBQUEsVUFBQSxHQUFBLENBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBO1FBQ0EsR0FBQSxHQUFBLElBQUEsQ0FBQSxJQUFBLEtBQUEsVUFBQSxHQUFBLENBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLElBaEJBOzthQWlCQSxJQUFBLENBQUEsUUFBQSxHQUFBLElBQUEsUUFBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUE7SUFyQkE7O29CQXdCQSxZQUFBLEdBQUEsU0FBQSxTQUFBLEVBQUEsU0FBQTs7UUFBQSxZQUFBOzs7UUFBQSxZQUFBOzthQUNBLElBQUEsQ0FBQSxTQUFBLEdBQUEsSUFBQSxTQUFBLENBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsSUFBQTtJQURBOztvQkFLQSxNQUFBLEdBQUEsU0FBQSxRQUFBO0FBRUEsVUFBQTtNQUFBLElBQUEsTUFBQSxJQUFBLFFBQUE7UUFBQSxJQUFBLENBQUEsSUFBQSxHQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUE7O01BR0EsRUFBQSxHQUFBO01BQ0EsRUFBQSxHQUFBO0FBQ0EsV0FBQSxhQUFBOztBQUNBLGdCQUFBLENBQUE7QUFBQSxlQUNBLGNBREE7WUFDQSxJQUFBLENBQUEsV0FBQSxDQUFBLENBQUE7QUFBQTtBQURBLGVBRUEsU0FGQTtZQUVBLElBQUEsQ0FBQSxPQUFBLEdBQUE7QUFBQTtBQUZBLGVBR0EsY0FIQTtZQUdBLElBQUEsQ0FBQSxNQUFBLEdBQUE7QUFBQTtBQUhBLGVBSUEsZUFKQTtZQUlBLEVBQUEsR0FBQTtBQUFBO0FBSkEsZUFLQSxlQUxBO1lBS0EsRUFBQSxHQUFBO0FBQUE7QUFMQSxlQU1BLGFBTkE7WUFNQSxJQUFBLENBQUEsV0FBQSxHQUFBO0FBTkE7QUFEQTthQVFBLElBQUEsQ0FBQSxZQUFBLENBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsSUFBQTtJQWZBOztvQkFtQkEsV0FBQSxHQUFBLFNBQUE7QUFDQSxVQUFBO01BQUEsRUFBQSxHQUFBLElBQUEsQ0FBQSxTQUFBLENBQUE7TUFDQSxFQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtNQUNBLE9BQUEsS0FBQTtNQUNBLE9BQUEsS0FBQTtNQUNBLFFBQUEsR0FDQTtRQUFBLFlBQUEsRUFBQSxJQUFBLENBQUEsT0FBQTtRQUNBLElBQUEsRUFBQSxJQUFBLENBQUEsSUFEQTtRQUVBLE9BQUEsRUFBQSxJQUFBLENBQUEsT0FGQTtRQUdBLGNBQUEsRUFBQSxJQUFBLENBQUEsTUFIQTtRQUlBLGVBQUEsRUFBQSxFQUpBO1FBS0EsZUFBQSxFQUFBLEVBTEE7UUFNQSxhQUFBLEVBQUEsSUFBQSxDQUFBLFdBTkE7O0FBT0EsYUFBQTtJQWJBOzs7Ozs7RUFrQkE7SUFFQSxtQkFBQTtNQUNBLElBQUEsQ0FBQSxXQUFBLENBQUE7SUFEQTs7d0JBS0EsUUFBQSxHQUFBLFNBQUEsS0FBQSxFQUFBLFFBQUE7O1FBQUEsV0FBQTs7TUFDQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBO01BQ0EsSUFBQSxRQUFBO2VBQUEsSUFBQSxDQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLEVBQUE7O0lBRkE7O3dCQVNBLFdBQUEsR0FBQSxTQUFBLE1BQUE7QUFDQSxVQUFBO01BQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQSxHQUVBLEtBQUEsR0FBQTs7QUFBQTtBQUFBO2FBQUEsNkNBQUE7O2NBQUEsQ0FBQSxDQUFBLElBQUEsS0FBQTt5QkFBQTs7QUFBQTs7bUJBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxJQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtNQUNBLElBQUEsNEJBQUEsSUFBQSwwQkFBQTtRQUNBLE1BQUEsR0FBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxLQUFBLEdBQUE7ZUFDQSxJQUFBLENBQUEsYUFBQSxDQUFBLE1BQUEsRUFGQTs7SUFMQTs7d0JBV0EsV0FBQSxHQUFBLFNBQUE7TUFDQSxJQUFBLENBQUEsTUFBQSxHQUFBO2FBQ0EsSUFBQSxDQUFBLFdBQUEsR0FBQTtJQUZBOzt3QkFNQSxhQUFBLEdBQUEsU0FBQSxLQUFBO2FBQ0EsSUFBQSxDQUFBLFdBQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLEtBQUE7SUFEQTs7d0JBS0EsaUJBQUEsR0FBQSxTQUFBLFFBQUE7YUFDQSxJQUFBLENBQUEsV0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBO0lBREE7O3dCQUtBLGFBQUEsR0FBQSxTQUFBO0FBQ0EsVUFBQTtBQUFBOztBQUFBO0FBQUE7YUFBQSxxQ0FBQTs7dUJBQUEsQ0FBQSxDQUFBO0FBQUE7OztJQURBOzt3QkFLQSxvQkFBQSxHQUFBLFNBQUE7QUFDQSxVQUFBO0FBQUE7O0FBQUE7QUFBQTthQUFBLHFDQUFBOzt1QkFBQSxDQUFBLENBQUE7QUFBQTs7O0lBREE7O3dCQUtBLGNBQUEsR0FBQSxTQUFBO0FBQ0EsYUFBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLENBQUEsV0FBQTtJQURBOzt3QkFNQSxZQUFBLEdBQUEsU0FBQTtBQUNBLFVBQUE7TUFBQSxJQUFBOztBQUFBO0FBQUE7YUFBQSxxQ0FBQTs7Y0FBQSxDQUFBLENBQUE7eUJBQUEsQ0FBQSxDQUFBOztBQUFBOzs7TUFDQSxRQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQTtNQUNBLElBQUEsR0FBQSxRQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7TUFDQSxJQUFBLElBQUEsQ0FBQSxNQUFBO2VBQUEsSUFBQSxDQUFBLENBQUEsRUFBQTtPQUFBLE1BQUE7ZUFBQSxRQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsR0FBQSxRQUFBLENBQUEsTUFBQSxDQUFBLEVBQUE7O0lBSkE7O3dCQWNBLFVBQUEsR0FBQSxTQUFBLFFBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQTtBQUNBLFVBQUE7O1FBREEsVUFBQTs7O1FBQUEsV0FBQTs7TUFDQSxTQUFBLEdBQUE7TUFDQSxPQUFBLEdBQUE7TUFDQSxRQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQTtNQUNBLEtBQUEsR0FBQSxRQUFBLENBQUE7QUFDQTtBQUFBLFdBQUEsNkNBQUE7O1FBQ0EsRUFBQSxHQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7UUFDQSxJQUFBLEVBQUEsR0FBQSxDQUFBO1VBQ0EsSUFBQSxPQUFBO0FBQ0EscUJBREE7V0FBQSxNQUFBO1lBR0EsRUFBQSxHQUFBO1lBQ0EsSUFBQSxRQUFBO2NBQUEsRUFBQSxJQUFBLE1BQUE7O1lBQ0EsT0FBQSxJQUFBLEVBTEE7V0FEQTtTQUFBLE1BT0EsSUFBQSxDQUFBLENBQUEsT0FBQSxJQUFBLFFBQUEsQ0FBQTtVQUNBLEVBQUEsSUFBQSxRQURBOztRQUVBLFNBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQTtBQVhBO2FBWUEsSUFBQSxDQUFBLE1BQUEsR0FBQTtJQWpCQTs7Ozs7O0VBc0JBO0lBRUEsbUJBQUEsVUFBQSxFQUFBLFVBQUEsRUFBQSxJQUFBO01BQUEsSUFBQSxDQUFBLFlBQUE7TUFBQSxJQUFBLENBQUEsWUFBQTtNQUFBLElBQUEsQ0FBQSxzQkFBQSxPQUFBO0lBQUE7O3dCQUlBLElBQUEsR0FBQSxTQUFBLElBQUE7QUFDQSxVQUFBO01BQUEsSUFBQSxJQUFBLENBQUEsU0FBQSxLQUFBLENBQUEsSUFBQSxJQUFBLENBQUEsU0FBQSxLQUFBLENBQUEsSUFBQSxJQUFBLENBQUEsSUFBQSxLQUFBLE1BQUE7QUFBQSxlQUFBLEtBQUE7O01BRUEsR0FBQSxHQUFBO0FBQ0EsV0FBQSxvRkFBQTtRQUNBLEdBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUEsQ0FBQTtZQUNBLElBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsS0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsR0FBQSxDQUFBLElBQUEsS0FBQSxDQUFBLElBQUEsS0FBQSxVQUFBLENBQUE7cUJBQUEsRUFBQTthQUFBLE1BQUE7cUJBQUEsRUFBQTs7VUFEQTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtBQURBO0FBR0EsYUFBQTtJQVBBOzs7Ozs7RUFhQSxTQUFBLEdBSUE7SUFBQSxZQUFBLEVBQUEsU0FBQSxJQUFBO0FBQ0EsVUFBQTtNQUFBLENBQUEsR0FBQSxJQUFBLEtBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxXQUFBLGlGQUFBO1FBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO0FBQUE7QUFDQSxXQUFBLGdHQUFBO1FBQ0EsU0FBQSxHQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLGFBQUEsOEZBQUE7VUFDQSxDQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQTtBQURBO0FBRkE7QUFJQSxhQUFBO0lBUEEsQ0FBQTtJQVVBLGNBQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxJQUFBO0FBQ0EsVUFBQTtNQUFBLEdBQUEsR0FBQTtBQUNBLFdBQUEsZ0ZBQUE7UUFDQSxHQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUE7QUFDQSxhQUFBLHFGQUFBO1VBQ0EsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO0FBQ0EsZUFBQSxxRkFBQTtZQUNBLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQTtZQUNBLFNBQUEsR0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQSxDQUFBLENBQUE7QUFGQTtBQUZBO0FBRkE7QUFPQSxXQUFBLHdGQUFBO1FBQ0EsSUFBQSxPQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxTQUFBO0FBQUEsbUJBQUE7O1FBQ0EsQ0FBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxHQUFBLFNBQUE7UUFDQSxDQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxTQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxDQUFBLENBQUE7UUFDQSxDQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxDQUFBLENBQUE7UUFDQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsR0FBQSxDQUFBLENBQUE7QUFMQTtBQU1BLGFBQUE7SUFmQSxDQVZBO0lBNEJBLHFCQUFBLEVBQUEsU0FBQSxZQUFBLEVBQUEsUUFBQTtBQUNBLFVBQUE7TUFBQSxDQUFBLEdBQUE7QUFFQSxXQUFBLDRCQUFBO1FBQ0EsR0FBQTs7QUFBQTtlQUFBLDRCQUFBO3lCQUFBO0FBQUE7OztRQUNBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxZQUFBLENBQUEsRUFBQTtRQUNBLEdBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxRQUFBLENBQUEsRUFBQTtRQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsR0FBQTtBQUpBO01BS0EsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBO0FBQ0EsYUFBQTtJQVRBLENBNUJBO0lBMENBLG9CQUFBLEVBQUEsU0FBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUE7QUFDQSxVQUFBOztRQURBLFFBQUE7O01BQ0EsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxNQUFBO01BQ0EsTUFBQSxHQUFBLE1BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQTtNQUNBLE1BQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQTtNQUNBLENBQUEsR0FBQSxFQUFBLENBQUEsTUFBQTtNQUNBLEdBQUEsR0FBQTtNQUNBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQTtRQUNBLElBQUEsS0FBQTtVQUFBLENBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTs7ZUFDQSxHQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7TUFGQSxDQUFBO0FBR0EsYUFBQTtJQVRBLENBMUNBO0lBdURBLGFBQUEsRUFBQSxTQUFBLE1BQUE7QUFDQSxVQUFBO01BQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsR0FBQSxDQUFBO0FBQ0EsYUFBQSxJQUFBLENBQUEsb0JBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQTtJQUZBLENBdkRBO0lBMkRBLGFBQUEsRUFBQSxTQUFBLE1BQUE7QUFDQSxVQUFBO01BQUEsTUFBQSxHQUFBLElBQUEsQ0FBQSxxQkFBQSxDQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsRUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLEVBQUEsSUFBQSxHQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxFQUFBLElBQUEsR0FBQSxHQUFBLEVBQUEsS0FBQSxHQUFBLEdBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLG9CQUFBLENBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxLQUFBO0lBRkEsQ0EzREE7SUFnRUEsWUFBQSxFQUFBLFNBQUEsTUFBQTtBQUNBLFVBQUE7TUFBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLHFCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLG9CQUFBLENBQUEsTUFBQSxFQUFBLE1BQUE7SUFGQSxDQWhFQTtJQXFFQSxZQUFBLEVBQUEsU0FBQSxNQUFBO0FBQ0EsVUFBQTtNQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEscUJBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQTtBQUNBLGFBQUEsSUFBQSxDQUFBLG9CQUFBLENBQUEsTUFBQSxFQUFBLE1BQUE7SUFGQSxDQXJFQTs7O0VDbFZBO0lBRUEsdUJBQUEsT0FBQSxFQUFBLFlBQUEsRUFBQSxrQkFBQTtNQUFBLElBQUEsQ0FBQSxTQUFBO01BQUEsSUFBQSxDQUFBLGNBQUE7TUFBQSxJQUFBLENBQUEsb0JBQUE7TUFFQSxJQUFBLENBQUEsWUFBQSxHQUFBLElBQUEsQ0FBQSxNQUFBLENBQUE7TUFDQSxJQUFBLENBQUEsVUFBQSxHQUFBO01BR0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxRQUFBLENBQUE7UUFDQSxNQUFBLEVBQUEsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTtBQUNBLGdCQUFBO1lBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLGtCQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsU0FBQTtBQUNBLHFCQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsQ0FBQSxJQUFBLENBQUE7WUFEQSxDQUFBLENBQUEsQ0FFQSxDQUFBLE9BRkEsQ0FBQTttQkFHQSxLQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxHQUFBLElBQUE7VUFKQTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FEQTtPQUFBO01BU0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxpQkFBQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQSxDQUFBO2lCQUNBLEtBQUEsQ0FBQSxlQUFBLENBQUE7UUFEQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtJQWZBOzs0QkFvQkEsU0FBQSxHQUFBLFNBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxXQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLFNBQUE7QUFDQSxVQUFBO01BQUEsTUFBQSxHQUFBLElBQUEsZUFBQSxDQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLFdBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLEtBQUEsRUFBQSxJQUFBO01BQ0EsSUFBQSxpQkFBQTtRQUFBLElBQUEsQ0FBQSxxQkFBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLEVBQUE7O2FBQ0EsSUFBQSxDQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsR0FBQTtJQUhBOzs0QkFNQSxZQUFBLEdBQUEsU0FBQSxJQUFBLEVBQUEsT0FBQTtBQUNBLFVBQUE7TUFBQSxFQUFBLEdBQUEsSUFBQSxrQkFBQSxDQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQTthQUNBLElBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEdBQUE7SUFGQTs7NEJBS0EscUJBQUEsR0FBQSxTQUFBLE9BQUEsRUFBQSxNQUFBO0FBQ0EsVUFBQTtNQUFBLElBQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxHQUFBO01BQ0EsRUFBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxNQUFBO2FBQ0EsTUFBQSxDQUFBLGVBQUEsQ0FBQSxFQUFBO0lBSEE7OzRCQU1BLGNBQUEsR0FBQSxTQUFBLE9BQUE7YUFDQSxJQUFBLENBQUEsVUFBQSxDQUFBLGNBQUEsQ0FBQSxHQUFBLElBQUEsZUFBQSxDQUFBLElBQUEsRUFBQSxjQUFBLEVBQUEsT0FBQSxFQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsQ0FBQTtJQURBOzs0QkFJQSxhQUFBLEdBQUEsU0FBQSxPQUFBO2FBQ0EsSUFBQSxDQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQSxJQUFBLGVBQUEsQ0FBQSxJQUFBLEVBQUEsWUFBQSxFQUFBLE9BQUEsRUFBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsVUFBQSxDQUFBO0lBREE7OzRCQU9BLHFCQUFBLEdBQUEsU0FBQSxPQUFBLEVBQUEsUUFBQTtBQUNBLFVBQUE7TUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBO01BQ0EsYUFBQSxHQUFBO1FBQ0EsT0FBQSxFQUFBLFVBREE7UUFFQSxVQUFBLEVBQUEsWUFGQTtRQUdBLE1BQUEsRUFBQSxRQUhBOztBQUtBLFdBQUEsYUFBQTs7UUFDQSxJQUFBLENBQUEsSUFBQSxhQUFBO1VBQ0EsT0FBQSxHQUFBLENBQUEsR0FBQSxVQUFBLEdBQUE7VUFDQSxDQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLHdFQUFBLEdBQUEsT0FBQSxHQUFBLE9BQUEsR0FBQSxDQUFBLEdBQUEsSUFBQSxHQUFBLGFBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxRQUFBLEVBRkE7O0FBREE7YUFJQSxDQUFBLENBQUEsZUFBQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQSxDQUFBO2lCQUNBLEtBQUEsQ0FBQSxpQkFBQSxDQUFBO1FBREE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUE7SUFYQTs7NEJBbUJBLGVBQUEsR0FBQSxTQUFBO0FBQ0EsVUFBQTtNQUFBLFFBQUEsR0FBQTtBQUNBO0FBQUEsV0FBQSxXQUFBOztRQUNBLFFBQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxTQUFBLENBQUEsUUFBQSxDQUFBO0FBREE7YUFFQSxJQUFBLENBQUEsTUFBQSxDQUFBLGNBQUEsQ0FBQSxRQUFBO0lBSkE7OzRCQU9BLGlCQUFBLEdBQUEsU0FBQTtBQUNBLFVBQUE7TUFBQSxRQUFBLEdBQUE7QUFDQTtBQUFBLFdBQUEscUNBQUE7O1FBQ0EsRUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsSUFBQTtRQUNBLEdBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLFVBQUEsQ0FBQSxHQUFBLElBQUEsR0FBQTtRQUNBLFFBQUEsQ0FBQSxFQUFBLEdBQUEsU0FBQSxDQUFBLEdBQUE7QUFIQTthQUlBLElBQUEsQ0FBQSxNQUFBLENBQUEsa0JBQUEsQ0FBQSxRQUFBLEVBQUEsSUFBQTtJQU5BOzs0QkFTQSxnQkFBQSxHQUFBLFNBQUEsUUFBQTtBQUNBLFVBQUE7QUFBQTtXQUFBLGdCQUFBOztRQUNBLElBQUEsSUFBQSxJQUFBLElBQUEsQ0FBQSxVQUFBO3VCQUNBLElBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsR0FEQTtTQUFBLE1BQUE7K0JBQUE7O0FBREE7O0lBREE7OzRCQU9BLHNCQUFBLEdBQUEsU0FBQSxLQUFBO01BQ0EsSUFBQSxlQUFBLElBQUEsSUFBQSxDQUFBLFVBQUE7UUFDQSxJQUFBLENBQUEsVUFBQSxDQUFBLGVBQUEsQ0FBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEdBQUEsRUFEQTs7TUFFQSxJQUFBLGVBQUEsSUFBQSxJQUFBLENBQUEsVUFBQTtlQUNBLElBQUEsQ0FBQSxVQUFBLENBQUEsZUFBQSxDQUFBLENBQUEsUUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxFQURBOztJQUhBOzs0QkFRQSxlQUFBLEdBQUEsU0FBQSxNQUFBLEVBQUEsYUFBQTtBQUNBLFVBQUE7TUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQTtBQUNBLFdBQUEsc0ZBQUE7UUFDQSxDQUFBLEdBQUEsTUFBQSxDQUFBLENBQUE7UUFFQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxxQkFBQSxHQUNBLDRHQURBLEdBRUE7UUFFQSxhQUFBLEdBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxtQkFBQSxHQUNBLHlHQURBLEdBRUE7UUFFQSxhQUFBLEdBQUEsSUFBQSxHQUNBLDBHQURBLEdBRUE7UUFHQSxDQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FDQSxDQUFBLENBQUEsQ0FBQSw4QkFBQSxHQUFBLGVBQUEsR0FBQSwyQkFBQSxDQUFBLEdBQUEsQ0FBQSxHQUNBLENBQUEsUUFBQSxHQUFBLGFBQUEsR0FBQSxhQUFBLEdBQUEsT0FBQSxDQURBLENBREE7QUFoQkE7TUFxQkEsQ0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUEsQ0FBQTtpQkFDQSxLQUFBLENBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUE7UUFEQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtNQUtBLENBQUEsQ0FBQSxrQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQSxDQUFBO2lCQUNBLEtBQUEsQ0FBQSxXQUFBLENBQUEsQ0FBQSxDQUFBLGtCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7UUFEQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtNQUdBLENBQUEsQ0FBQSxnQkFBQSxDQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQSxDQUFBO1VBQ0EsSUFBQSxPQUFBLENBQUEsNkNBQUEsQ0FBQTttQkFDQSxLQUFBLENBQUEsTUFBQSxDQUFBLFdBQUEsQ0FBQSxDQUFBLENBQUEsZ0JBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxFQURBOztRQURBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBO01BSUEsQ0FBQSxDQUFBLGdCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBLENBQUE7aUJBQ0EsS0FBQSxDQUFBLE1BQUEsQ0FBQSxhQUFBLENBQUEsQ0FBQSxDQUFBLGdCQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxPQUFBLENBQUEsS0FBQSxDQUFBLENBQUE7UUFEQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTthQUlBLENBQUEsQ0FBQSxJQUFBLENBQUEsV0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLGFBQUE7SUF2Q0E7OzRCQTBDQSxxQkFBQSxHQUFBLFNBQUEsT0FBQTtBQUNBLFVBQUE7TUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxxQkFBQTtBQUFBLGVBQUE7O0FBQ0E7V0FBQSx1RkFBQTtRQUNBLElBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTt1QkFDQSxDQUFBLENBQUEsdUJBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxXQUFBLENBQUEsK0JBQUEsQ0FBQSxDQUFBLFFBQUEsQ0FBQSw4QkFBQSxHQURBO1NBQUEsTUFBQTt1QkFHQSxDQUFBLENBQUEsdUJBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxXQUFBLENBQUEsOEJBQUEsQ0FBQSxDQUFBLFFBQUEsQ0FBQSwrQkFBQSxHQUhBOztBQURBOztJQUZBOzs0QkFTQSxvQkFBQSxHQUFBLFNBQUEsRUFBQTtNQUNBLENBQUEsQ0FBQSxjQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLENBQUEsUUFBQSxDQUFBLFVBQUE7YUFDQSxDQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLE1BQUEsR0FBQSxFQUFBLEdBQUEsR0FBQSxDQUFBLENBQUEsV0FBQSxDQUFBLFVBQUE7SUFGQTs7NEJBS0EsV0FBQSxHQUFBLFNBQUEsRUFBQTthQUNBLElBQUEsQ0FBQSxNQUFBLENBQUEsV0FBQSxDQUFBLEVBQUE7SUFEQTs7Ozs7O0VBTUE7SUFFQSxtQkFBQSxPQUFBO01BQUEsSUFBQSxDQUFBLFNBQUE7TUFDQSxJQUFBLENBQUEsTUFBQSxHQUFBO0lBREE7O3dCQUlBLFlBQUEsR0FBQSxTQUFBLElBQUEsRUFBQSxPQUFBO2FBQ0EsSUFBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsR0FBQSxJQUFBLFNBQUEsQ0FBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLE9BQUE7SUFEQTs7d0JBSUEsbUJBQUEsR0FBQSxTQUFBLElBQUEsRUFBQSxPQUFBO0FBQ0EsVUFBQTtNQUFBLE1BQUEsR0FBQSxDQUFBLENBQUEsT0FBQTtBQUVBLFdBQUEseUJBQUE7UUFDQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxxQ0FBQSxHQUFBLElBQUEsR0FBQSxVQUFBLENBQUE7QUFEQTthQUdBLENBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBLENBQUE7QUFDQSxjQUFBO0FBQUEsZUFBQSx5QkFBQTtZQUNBLEVBQUEsR0FBQSxDQUFBLENBQUEsWUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTtZQUdBLEtBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLFNBQUEsQ0FBQSxhQUFBLENBQUEsRUFBQTtZQUNBLEtBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO0FBTEE7aUJBTUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUE7UUFQQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtJQU5BOzt3QkFpQkEsTUFBQSxHQUFBLFNBQUEsSUFBQTtBQUNBLFVBQUE7QUFBQTtXQUFBLFNBQUE7O1FBQ0EsSUFBQSxDQUFBLElBQUEsSUFBQSxDQUFBLE1BQUE7VUFFQSxJQUFBLENBQUEsS0FBQSxvQkFBQTs7O0FBQ0E7bUJBQUEsUUFBQTs7OEJBQ0EsQ0FBQSxDQUFBLE9BQUEsR0FBQSxDQUFBLEdBQUEsTUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLEdBQUE7QUFEQTs7a0JBREE7V0FBQSxNQUFBO1lBS0EsSUFBQSxDQUFBLEtBQUEsZUFBQTtjQUNBLENBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLElBREE7O3lCQUVBLENBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxDQUFBLEdBUEE7V0FGQTtTQUFBLE1BQUE7K0JBQUE7O0FBREE7O0lBREE7Ozs7OztFQWVBOztBQUVBOzs7O0lBSUEsc0JBQUEsT0FBQTtNQUVBLElBQUEsQ0FBQSxRQUFBLEdBQUE7UUFDQSxjQUFBLEVBQUEsS0FEQTtRQUVBLGlCQUFBLEVBQUEsSUFGQTtRQUdBLGVBQUEsRUFBQSxDQUhBO1FBSUEsZUFBQSxFQUFBLE1BSkE7UUFLQSxhQUFBLEVBQUEsSUFMQTtRQU1BLHFCQUFBLEVBQUEsSUFOQTtRQU9BLG1CQUFBLEVBQUEsSUFQQTs7TUFTQSxJQUFBLENBQUEsY0FBQSxDQUFBLE9BQUE7SUFYQTs7MkJBY0EsY0FBQSxHQUFBLFNBQUEsT0FBQTtBQUNBLFVBQUE7TUFBQSxDQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsT0FBQTtBQUNBO0FBQUEsV0FBQSxRQUFBOztRQUNBLElBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQTtBQURBO2FBRUEsSUFBQSxDQUFBLFVBQUEsR0FBQSxJQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsaUJBQUEsRUFBQSxJQUFBLENBQUEsZUFBQSxFQUFBLElBQUEsQ0FBQSxlQUFBO0lBSkE7Ozs7OztFQVFBO0lBRUEsY0FBQSxPQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUE7TUFBQSxJQUFBLENBQUEsU0FBQTtNQUFBLElBQUEsQ0FBQSxlQUFBO01BQUEsSUFBQSxDQUFBLFVBQUE7TUFBQSxJQUFBLENBQUEsTUFBQTtNQUFBLElBQUEsQ0FBQSwyQkFBQSxVQUFBO01BQUEsSUFBQSxDQUFBLDJCQUFBLFVBQUE7Ozs7TUFDQSxJQUFBLENBQUEsV0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLFdBQUEsQ0FBQTtJQUZBOzttQkFNQSxTQUFBLEdBQUEsU0FBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLFdBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsU0FBQTtNQUNBLElBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxlQUFBLENBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsV0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLElBQUE7TUFDQSxJQUFBLGlCQUFBO2VBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxxQkFBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsTUFBQSxFQUFBOztJQUZBOzttQkFLQSxLQUFBLEdBQUEsU0FBQTtBQUVBLFVBQUE7TUFBQSxZQUFBLEdBQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLEVBQUEsRUFBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsWUFBQSxDQUFBLENBQUE7TUFDQSxJQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxHQUFBO01BQ0EsSUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxJQUFBLENBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxNQUFBO2FBQ0EsSUFBQSxDQUFBLE9BQUEsQ0FBQSxxQkFBQSxDQUFBLFlBQUE7SUFOQTs7bUJBU0EsV0FBQSxHQUFBLFNBQUE7TUFLQSxJQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLFFBQUE7TUFDQSxJQUFBLENBQUEsS0FBQSxHQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxVQUFBLENBQUEsSUFBQTtNQUNBLGVBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQTtNQUNBLElBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQTtNQUNBLElBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUEsR0FBQTtNQUNBLElBQUEsQ0FBQSxTQUFBLEdBQUE7TUFDQSxJQUFBLENBQUEsV0FBQSxHQUFBO2FBQ0EsSUFBQSxDQUFBLEtBQUEsQ0FBQTtJQWRBOzttQkFpQkEsS0FBQSxHQUFBLFNBQUEsS0FBQTtBQUNBLFVBQUE7TUFBQSxJQUFBLElBQUEsQ0FBQSxLQUFBLEtBQUEsQ0FBQTtRQUFBLElBQUEsQ0FBQSxXQUFBLENBQUEsRUFBQTs7TUFDQSxJQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsSUFBQSxDQUFBLE1BQUE7TUFDQSxJQUFBLEdBQUEsS0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQTtNQUNBLEdBQUEsR0FBQSxLQUFBLENBQUE7TUFDQSxJQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEVBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsRUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxFQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxLQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxLQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUEsR0FBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7TUFDQSxJQUFBLENBQUEsS0FBQSxHQUFBO01BQ0EsSUFBQSxDQUFBLEtBQUEsR0FBQTtNQUNBLElBQUEsR0FBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsV0FBQSxHQUFBLEtBQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxHQUFBO0FBQ0EsV0FBQSwwRkFBQTtBQUNBLGFBQUEsK0ZBQUE7VUFDQSxJQUFBLE9BQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxLQUFBLFNBQUEsR0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQTtBQUFBLHFCQUFBOztVQUNBLEVBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBO1VBQ0EsRUFBQSxHQUFBLElBQUEsQ0FBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUE7VUFDQSxHQUFBLEdBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBQUE7VUFDQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsR0FBQTtVQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsS0FBQSxHQUFBLElBQUEsRUFBQSxLQUFBLEdBQUEsSUFBQTtBQU5BO0FBREE7TUFRQSxJQUFBLENBQUEsT0FBQSxDQUFBLFdBQUEsR0FBQTtNQUNBLElBQUEsbUJBQUE7UUFDQSxHQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsSUFBQSxDQUFBLEdBQUE7UUFDQSxJQUFBLElBQUEsQ0FBQSxHQUFBLEtBQUEsTUFBQSxDQUFBLEtBQUE7VUFBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLElBQUE7O2VBQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsRUFBQSxPQUFBLEVBQUEsR0FBQSxFQUhBOztJQXRCQTs7bUJBNEJBLGNBQUEsR0FBQSxTQUFBO0FBQ0EsVUFBQTtNQUFBLEVBQUEsR0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBO0FBQUEsZUFBQTs7TUFDQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsR0FBQSxFQUFBLENBQUE7TUFDQSxJQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQTtNQUNBLElBQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQSxDQUFBO01BQ0EsSUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxFQUFBLElBQUEsR0FBQSxFQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsRUFBQSxJQUFBLENBQUEsS0FBQSxFQUFBLEVBQUEsQ0FBQSxLQUFBO2FBQ0EsSUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsSUFBQSxHQUFBLEVBQUEsQ0FBQSxLQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxFQUFBLENBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxNQUFBO0lBUEE7O21CQVdBLFVBQUEsR0FBQSxTQUFBO0FBQ0EsVUFBQTtNQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLGFBQUE7QUFBQSxlQUFBOztNQUNBLFFBQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLEdBQUEsRUFBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsU0FBQSxHQUFBO01BQ0EsSUFBQSxDQUFBLE9BQUEsQ0FBQSxJQUFBLEdBQUEsUUFBQSxHQUFBO01BR0EsSUFBQSxDQUFBLE9BQUEsQ0FBQSxTQUFBLEdBQUE7TUFDQSxJQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsR0FBQTtNQUNBLFFBQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLEdBQUE7TUFDQSxJQUFBLFFBQUEsR0FBQSxDQUFBO1FBQUEsUUFBQSxHQUFBLEdBQUEsR0FBQSxTQUFBOztNQUNBLFNBQUEsR0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQTtNQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsRUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUE7TUFHQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsR0FBQTtBQUVBLGNBQUEsSUFBQSxDQUFBLEdBQUE7QUFBQSxhQUNBLENBREE7VUFFQSxJQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQSxNQUFBO2lCQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsRUFBQSxHQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUE7QUFIQSxhQUlBLENBSkE7VUFLQSxJQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxNQUFBO2lCQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsRUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUE7QUFOQSxhQU9BLENBUEE7VUFRQSxJQUFBLENBQUEsT0FBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsSUFBQSxHQUFBLElBQUEsQ0FBQSxNQUFBO2lCQUNBLElBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLEtBQUEsRUFBQSxJQUFBLEdBQUEsSUFBQSxDQUFBLE1BQUE7QUFUQTtJQWpCQTs7bUJBOEJBLGNBQUEsR0FBQSxTQUFBLEtBQUE7TUFDQSxJQUFBLElBQUEsQ0FBQSxHQUFBLEtBQUEsTUFBQSxDQUFBLEtBQUE7UUFBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLE1BQUE7O2FBQ0EsSUFBQSxDQUFBLE1BQUEsQ0FBQSxrQkFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsS0FBQTtJQUZBOzttQkFRQSxXQUFBLEdBQUEsU0FBQSxDQUFBLEVBQUEsQ0FBQTtBQUNBLFVBQUE7TUFBQSxJQUFBLEdBQUEsQ0FBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7TUFDQSxJQUFBLENBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQTtNQUNBLFFBQUEsR0FBQSxDQUFBLEdBQUEsSUFBQSxDQUFBLENBQUE7TUFDQSxRQUFBLEdBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxDQUFBO01BR0EsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLEdBQUEsUUFBQSxDQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUE7TUFDQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLENBQUEsR0FBQSxRQUFBLENBQUEsR0FBQSxHQUFBLENBQUEsR0FBQTtBQUNBLGFBQUE7UUFBQSxDQUFBLEVBQUEsQ0FBQTtRQUFBLENBQUEsRUFBQSxDQUFBOztJQVRBOzttQkFZQSxXQUFBLEdBQUEsU0FBQTtBQUNBLFVBQUE7TUFBQSxNQUFBLEdBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQTtNQUNBLE1BQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBLFlBQUE7TUFDQSxNQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQSxHQUFBO1VBQ0EsUUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsYUFBQSxHQUFBLFFBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLGdCQUFBLEdBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxHQUFBO1VBQ0EsS0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1VBQ0EsS0FBQSxDQUFBLEtBQUEsR0FBQSxHQUFBLENBQUEsT0FBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEtBQUEsR0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO2lCQUNBLEtBQUEsQ0FBQSxTQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUE7UUFKQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtNQU1BLE1BQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBLEdBQUE7QUFDQSxjQUFBO1VBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxZQUFBLENBQUEsY0FBQTtBQUFBLG1CQUFBOztVQUNBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLE9BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtVQUNBLEtBQUEsQ0FBQSxLQUFBLEdBQUEsR0FBQSxDQUFBLE9BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsR0FBQTtVQUNBLElBQUEsS0FBQSxDQUFBLFNBQUE7WUFDQSxFQUFBLEdBQUEsS0FBQSxDQUFBLE9BQUEsQ0FBQSxnQkFBQSxDQUFBLEtBQUEsQ0FBQSxLQUFBLEVBQUEsS0FBQSxDQUFBLEtBQUE7WUFDQSxLQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBO21CQUNBLEtBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBLEVBSEE7O1FBSkE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUE7TUFTQSxNQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQSxHQUFBO2lCQUNBLEtBQUEsQ0FBQSxTQUFBLEdBQUE7UUFEQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtNQUdBLE1BQUEsQ0FBQSxFQUFBLENBQUEsZ0JBQUEsRUFBQSxJQUFBLENBQUEsYUFBQTthQUNBLE1BQUEsQ0FBQSxFQUFBLENBQUEsWUFBQSxFQUFBLElBQUEsQ0FBQSxhQUFBO0lBdEJBOzttQkF5QkEsWUFBQSxHQUFBLFNBQUEsQ0FBQTtBQUNBLFVBQUE7TUFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLE9BQUEsQ0FBQSxhQUFBO01BQ0EsTUFBQSxHQUFBLENBQUEsQ0FBQSxPQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO01BQ0EsTUFBQSxHQUFBLENBQUEsQ0FBQSxPQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsS0FBQSxHQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBO01BQ0EsRUFBQSxHQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsZ0JBQUEsQ0FBQSxNQUFBLEVBQUEsTUFBQTtNQUNBLEVBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQTtNQUNBLEVBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQTtNQUNBLEVBQUEsR0FBQSxJQUFBLENBQUEsV0FBQSxDQUFBLEVBQUEsRUFBQSxFQUFBO01BQ0EsSUFBQSxDQUFBLE1BQUEsQ0FBQSxrQkFBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsRUFBQSxDQUFBLENBQUEsRUFBQSxFQUFBLENBQUEsQ0FBQTthQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsT0FBQSxDQUFBLFlBQUE7SUFUQTs7bUJBWUEsS0FBQSxHQUFBLFNBQUEsTUFBQTtBQUNBLFVBQUE7TUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxjQUFBO0FBQUEsZUFBQTs7TUFDQSxFQUFBLEdBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxnQkFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEtBQUE7TUFDQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO01BQ0EsTUFBQSxHQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxDQUFBLFdBQUEsRUFBQSxNQUFBO01BQ0EsSUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLE1BQUE7TUFDQSxJQUFBLENBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsQ0FBQTthQUNBLElBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxDQUFBO0lBUEE7O21CQVVBLGFBQUEsR0FBQSxTQUFBLEdBQUE7QUFDQSxVQUFBO01BQUEsRUFBQSxHQUFBLEdBQUEsQ0FBQTtNQUNBLEtBQUEsR0FBQSxDQUFBLEVBQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQSxFQUFBLENBQUEsTUFBQSxHQUFBLENBQUEsRUFBQSxDQUFBLE1BQUEsR0FBQSxDQUFBLENBQUE7TUFDQSxJQUFBLEtBQUE7UUFBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEtBQUEsRUFBQTs7YUFDQSxHQUFBLENBQUEsY0FBQSxDQUFBLENBQUEsSUFBQTtJQUpBOzs7Ozs7RUFRQTtJQUVBLG9CQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUEsS0FBQTtNQUFBLElBQUEsQ0FBQSw2QkFBQSxXQUFBO01BQUEsSUFBQSxDQUFBLHdCQUFBLFFBQUE7TUFBQSxJQUFBLENBQUEsd0JBQUEsUUFBQTtJQUFBOzs7Ozs7RUFJQTtBQUlBLFFBQUE7O0lBQUEsUUFBQSxDQUFBLFFBQUEsR0FDQTtNQUFBLFNBQUEsRUFBQSxDQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQSxPQUFBLENBQUE7OztJQUVBLEtBQUEsR0FBQSxDQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBOztBQUNBLFNBQUEsdUNBQUE7O01BQ0EsUUFBQSxDQUFBLFFBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsT0FBQTtBQURBOztJQUdBLENBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLFFBQUEsRUFBQTtNQUNBLGtCQUFBLEVBQUEsQ0FBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLENBREE7TUFFQSxpQkFBQSxFQUFBLENBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxDQUZBO01BR0EsWUFBQSxFQUFBLENBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQSxDQUhBO0tBQUE7O0lBT0Esa0JBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxRQUFBLEVBQUEsTUFBQTtNQUFBLElBQUEsQ0FBQSxNQUFBO01BQUEsSUFBQSxDQUFBLE1BQUE7TUFBQSxJQUFBLENBQUEsNkJBQUEsV0FBQTtNQUFBLElBQUEsQ0FBQSx5QkFBQSxTQUFBO01BQ0EsSUFBQSxDQUFBLEtBQUEsR0FBQSxJQUFBLENBQUEsR0FBQSxHQUFBLElBQUEsQ0FBQTtNQUNBLElBQUEsQ0FBQSxNQUFBLEdBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUE7SUFGQTs7dUJBT0EsR0FBQSxHQUFBLFNBQUEsSUFBQTtBQUNBLFVBQUE7TUFBQSxHQUFBLEdBQUE7QUFDQSxXQUFBLG9GQUFBO1FBQ0EsR0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQSxDQUFBO21CQUNBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEtBQUEsQ0FBQTtVQURBO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFBO0FBREE7QUFHQSxhQUFBO0lBTEE7O3VCQVVBLFNBQUEsR0FBQSxTQUFBLE1BQUE7QUFDQSxVQUFBO01BQUEsT0FBQSxHQUFBLElBQUEsT0FBQSxDQUFBO01BQ0EsT0FBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBLEVBQUEsSUFBQSxDQUFBLEtBQUE7TUFDQSxPQUFBLENBQUEsV0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQTtNQUNBLE1BQUEsR0FBQTtBQUNBLFdBQUEsbUZBQUE7UUFBQSxNQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBLENBQUEsQ0FBQSxDQUFBO0FBQUE7QUFDQSxhQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsU0FBQSxDQUFBO2VBQUEsR0FBQSxHQUFBO01BQUEsQ0FBQTtJQU5BOzs7Ozs7RUFVQTtJQUVBLG1CQUFBLFNBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQTtNQUFBLElBQUEsQ0FBQSxZQUFBO01BQUEsSUFBQSxDQUFBLE9BQUE7TUFBQSxJQUFBLENBQUEsVUFBQTtNQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQSxDQUFBO2lCQUNBLEtBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxDQUFBO1FBREE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUE7SUFEQTs7d0JBS0EsUUFBQSxHQUFBLFNBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQTtJQURBOzt3QkFHQSxRQUFBLEdBQUEsU0FBQSxLQUFBO2FBQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxHQUFBLENBQUEsS0FBQTtJQURBOzt3QkFHQSxVQUFBLEdBQUEsU0FBQSxNQUFBO01BQ0EsTUFBQSxHQUFBLE1BQUEsR0FBQSxFQUFBLEdBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLEVBQUEsTUFBQTtJQUZBOzs7Ozs7RUFPQTs7O0lBRUEseUJBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUEsWUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUE7TUFBQSxJQUFBLENBQUEsWUFBQTtNQUFBLElBQUEsQ0FBQSxPQUFBO01BQUEsSUFBQSxDQUFBLFVBQUE7TUFBQSxJQUFBLENBQUEsY0FBQTtNQUFBLElBQUEsQ0FBQSxNQUFBO01BQUEsSUFBQSxDQUFBLE1BQUE7TUFBQSxJQUFBLENBQUEsUUFBQTtNQUFBLElBQUEsQ0FBQSxPQUFBOztNQUNBLElBQUEsQ0FBQSxLQUFBLEdBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxLQUFBLENBQUEsWUFBQSxDQUFBLEdBQUEsS0FBQSxHQUNBLElBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxHQUFBLEtBQUEsR0FDQTtNQUNBLElBQUEsQ0FBQSxXQUFBLENBQUE7SUFKQTs7OEJBTUEsTUFBQSxHQUFBLFNBQUEsQ0FBQSxFQUFBLEVBQUE7TUFFQSxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQTtRQUNBLElBQUEsQ0FBQSxTQUFBLENBQUEsY0FBQSxDQUFBLEVBQUEsQ0FBQSxLQUFBLEVBREE7T0FBQSxNQUFBO1FBSUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxlQUFBLENBQUEsQ0FBQSxFQUpBOzthQUtBLENBQUEsQ0FBQSxlQUFBLENBQUE7SUFQQTs7OEJBU0EsV0FBQSxHQUFBLFNBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLE1BQUEsQ0FDQTtRQUNBLFdBQUEsRUFBQSxJQUFBLENBQUEsV0FEQTtRQUVBLEtBQUEsRUFBQSxJQUFBLENBQUEsS0FGQTtRQUdBLEdBQUEsRUFBQSxJQUFBLENBQUEsR0FIQTtRQUlBLEdBQUEsRUFBQSxJQUFBLENBQUEsR0FKQTtRQUtBLElBQUEsRUFBQSxJQUFBLENBQUEsSUFMQTtRQU1BLEtBQUEsRUFBQSxJQUFBLENBQUEsTUFOQTtRQU9BLEtBQUEsRUFBQSxJQUFBLENBQUEsS0FQQTtPQURBO0lBREE7OzhCQWFBLFFBQUEsR0FBQSxTQUFBO2FBQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQTtJQURBOzs4QkFHQSxRQUFBLEdBQUEsU0FBQSxLQUFBO01BQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxFQUFBLEtBQUE7TUFDQSxJQUFBLHNCQUFBO2VBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxRQUFBLENBQUEsS0FBQSxFQUFBOztJQUZBOzs4QkFLQSxRQUFBLEdBQUEsU0FBQSxJQUFBLEVBQUEsSUFBQTtNQUFBLElBQUEsQ0FBQSxNQUFBO01BQUEsSUFBQSxDQUFBLE1BQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxRQUFBLEVBQUE7UUFBQSxHQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUE7UUFBQSxHQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUE7T0FBQTtJQURBOzs4QkFHQSxlQUFBLEdBQUEsU0FBQSxVQUFBO01BQUEsSUFBQSxDQUFBLFlBQUE7SUFBQTs7OztLQXpDQTs7RUE2Q0E7OztJQUVBLHlCQUFBLFNBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBLE9BQUE7QUFDQSxVQUFBO01BREEsSUFBQSxDQUFBLFlBQUE7TUFBQSxJQUFBLENBQUEsT0FBQTtNQUFBLElBQUEsQ0FBQSxVQUFBO01BQ0EsQ0FBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSxXQUFBLHlDQUFBOztRQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQSxtQkFBQSxDQUFBLENBQUEsSUFBQSxDQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFEQTtNQUVBLGlEQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQSxDQUFBLElBQUEsRUFBQSxJQUFBLENBQUEsT0FBQTtJQUpBOzs7O0tBRkE7O0VBVUE7OztJQUVBLDRCQUFBLFNBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBLE9BQUE7TUFBQSxJQUFBLENBQUEsWUFBQTtNQUFBLElBQUEsQ0FBQSxPQUFBO01BQUEsSUFBQSxDQUFBLFVBQUE7TUFBQSxJQUFBLENBQUEsMkJBQUEsVUFBQTtNQUdBLElBQUEsbUJBQUE7UUFDQSxJQUFBLENBQUEsUUFBQSxDQUFBLElBQUEsQ0FBQSxNQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7UUFFQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFBLENBQUE7QUFDQSxnQkFBQTtZQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsUUFBQSxDQUFBO1lBQ0EsSUFBQSxDQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsQ0FBQTtjQUNBLElBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsR0FBQTtnQkFDQSxDQUFBLEdBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQURBO2VBQUEsTUFFQSxJQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLEdBQUE7Z0JBQ0EsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFEQTs7Y0FFQSxLQUFBLENBQUEsUUFBQSxDQUFBLENBQUE7Y0FDQSxLQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO3FCQUNBLEtBQUEsQ0FBQSxTQUFBLENBQUEsZUFBQSxDQUFBLENBQUEsRUFQQTs7VUFGQTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQTtRQVdBLENBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxPQUFBLEVBQUEsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQSxDQUFBO1lBQ0EsS0FBQSxDQUFBLFFBQUEsQ0FBQSxLQUFBLENBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQSxDQUFBO21CQUNBLENBQUEsQ0FBQSxlQUFBLENBQUE7VUFGQTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxFQWRBOztJQUhBOztpQ0F1QkEsUUFBQSxHQUFBLFNBQUEsS0FBQTtNQUNBLENBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLENBQUEsR0FBQSxDQUFBLEtBQUE7YUFDQSxDQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxDQUFBLElBQUEsQ0FBQSxLQUFBO0lBRkE7Ozs7S0F6QkE7O0VBOEJBO0lBRUEsbUJBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxRQUFBO01BQUEsSUFBQSxDQUFBLFFBQUE7TUFBQSxJQUFBLENBQUEsT0FBQTtNQUFBLElBQUEsQ0FBQSxVQUFBO0lBQUE7Ozs7O0FGNWpCQSIsImZpbGUiOiJ2aWV3ZXIuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJcbndpbmRvdy5WaWV3ZXIgb3I9IHt9XG5cbiMjIyBWQVJJT1VTIEhFTFBGVUwgRlVOQ1RJT05TICMjI1xuXG4jIENoZWNrIGlmIGEgdmFyaWFibGUgaXMgYW4gYXJyYXlcbndpbmRvdy50eXBlSXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgKCB2YWx1ZSApIC0+IHJldHVybiB7fS50b1N0cmluZy5jYWxsKCB2YWx1ZSApIGlzICdbb2JqZWN0IEFycmF5XSdcbiMgQ2FsbCBvbiBhbiBhcnJheSB0byBnZXQgZWxlbWVudHMgbm90IGNvbnRhaW5lZCBpbiB0aGUgYXJndW1lbnQgYXJyYXlcbkFycmF5OjpkaWZmID0gKGEpIC0+XG4gIEBmaWx0ZXIgKGkpIC0+XG4gICAgbm90IChhLmluZGV4T2YoaSkgPiAtMSlcblxuIyBNYWluIFZpZXdlciBjbGFzcy5cbiMgRW1waGFzaXplcyBlYXNlIG9mIHVzZSBmcm9tIHRoZSBlbmQgdXNlcidzIHBlcnNwZWN0aXZlLCBzbyB0aGVyZSBpcyBzb21lXG4jIGNvbnNpZGVyYWJsZSByZWR1bmRhbmN5IGhlcmUgd2l0aCBmdW5jdGlvbmFsaXR5IGluIG90aGVyIGNsYXNzZXMtLVxuIyBlLmcuLCBjb3VsZCByZWZhY3RvciBtdWNoIG9mIHRoaXMgc28gdXNlcnMgaGF2ZSB0byBjcmVhdGUgdGhlIFVzZXJJbnRlcmZhY2VcbiMgY2xhc3MgdGhlbXNlbHZlcy5cbndpbmRvdy5WaWV3ZXIgPSBjbGFzcyBWaWV3ZXJcblxuICAjIENvbnN0YW50c1xuICBAQVhJQUw6IDJcbiAgQENPUk9OQUw6IDFcbiAgQFNBR0lUVEFMOiAwXG4gIEBYQVhJUzogMFxuICBAWUFYSVM6IDFcbiAgQFpBWElTOiAyXG5cbiAgY29uc3RydWN0b3IgOiAobGF5ZXJMaXN0SWQsIGxheWVyU2V0dGluZ0NsYXNzLCBAY2FjaGUgPSB0cnVlLCBvcHRpb25zID0ge30pIC0+XG5cbiAgICB4eXogPSBpZiAneHl6JyBvZiBvcHRpb25zIHRoZW4gb3B0aW9ucy54eXogZWxzZSBbMC4wLCAwLjAsIDAuMF1cblxuICAgICMgQ29vcmRpbmF0ZSBmcmFtZSBuYW1lczogeHl6ID0gd29ybGQ7IGlqayA9IGltYWdlOyBhYmMgPSBjYW52YXNcbiAgICBAY29vcmRzX2lqayA9IFRyYW5zZm9ybS5hdGxhc1RvSW1hZ2UoeHl6KSAgIyBpbml0aWFsaXplIGF0IG9yaWdpblxuICAgIEBjb29yZHNfYWJjID0gVHJhbnNmb3JtLmF0bGFzVG9WaWV3ZXIoeHl6KVxuICAgIEB2aWV3U2V0dGluZ3MgPSBuZXcgVmlld1NldHRpbmdzKG9wdGlvbnMpXG4gICAgQHZpZXdzID0gW11cbiAgICBAc2xpZGVycyA9IHt9XG4gICAgQGRhdGFQYW5lbCA9IG5ldyBEYXRhUGFuZWwoQClcbiAgICBAbGF5ZXJMaXN0ID0gbmV3IExheWVyTGlzdCgpXG4gICAgQHVzZXJJbnRlcmZhY2UgPSBuZXcgVXNlckludGVyZmFjZShALCBsYXllckxpc3RJZCwgbGF5ZXJTZXR0aW5nQ2xhc3MpXG4gICAgQGNhY2hlID0gYW1wbGlmeS5zdG9yZSBpZiBAY2FjaGUgYW5kIGFtcGxpZnk/XG4gICAgIyBrZXlzID0gQGNhY2hlKClcbiAgICAjIGZvciBrIG9mIGtleXNcbiAgICAjICAgQGNhY2hlKGssIG51bGwpXG5cbiAgIyBDdXJyZW50IHdvcmxkIGNvb3JkaW5hdGVzXG4gIGNvb3Jkc194eXo6IC0+XG4gICAgcmV0dXJuIFRyYW5zZm9ybS5pbWFnZVRvQXRsYXMoQGNvb3Jkc19pamspXG5cbiAgcGFpbnQ6IC0+XG4gICAgJChAKS50cmlnZ2VyKFwiYmVmb3JlUGFpbnRcIilcbiAgICBpZiBAbGF5ZXJMaXN0LmFjdGl2ZUxheWVyXG4gICAgICBAdXNlckludGVyZmFjZS51cGRhdGVUaHJlc2hvbGRTbGlkZXJzKEBsYXllckxpc3QuYWN0aXZlTGF5ZXIuaW1hZ2UpXG4gICAgICBAdXBkYXRlRGF0YURpc3BsYXkoKVxuICAgIGZvciB2IGluIEB2aWV3c1xuICAgICAgdi5jbGVhcigpXG4gICAgICAjIFBhaW50IGFsbCBsYXllcnMuIE5vdGUgdGhlIHJldmVyc2FsIG9mIGxheWVyIG9yZGVyIHRvIGVuc3VyZSBcbiAgICAgICMgdG9wIGxheWVycyBnZXQgcGFpbnRlZCBsYXN0LlxuICAgICAgZm9yIGwgaW4gQGxheWVyTGlzdC5sYXllcnMuc2xpY2UoMCkucmV2ZXJzZSgpXG4gICAgICAgIHYucGFpbnQobCkgaWYgbC52aXNpYmxlXG4gICAgICB2LmRyYXdDcm9zc2hhaXJzKClcbiAgICAgIHYuZHJhd0xhYmVscygpXG4gICAgJChAKS50cmlnZ2VyKFwiYmVmb3JlUGFpbnRcIilcbiAgICByZXR1cm4gdHJ1ZVxuXG5cbiAgY2xlYXI6IC0+XG4gICAgdi5jbGVhcigpIGZvciB2IGluIEB2aWV3c1xuXG5cbiAgcmVzZXRDYW52YXM6IC0+XG4gICAgdi5yZXNldENhbnZhcygpIGZvciB2IGluIEB2aWV3c1xuXG5cbiAgYWRkVmlldzogKGVsZW1lbnQsIGRpbSwgaW5kZXgsIGxhYmVscyA9IHRydWUpIC0+XG4gICAgQHZpZXdzLnB1c2gobmV3IFZpZXcoQCwgQHZpZXdTZXR0aW5ncywgZWxlbWVudCwgZGltLCBpbmRleCwgbGFiZWxzKSlcblxuXG4gIGFkZFNsaWRlcjogKG5hbWUsIGVsZW1lbnQsIG9yaWVudGF0aW9uLCBtaW4sIG1heCwgdmFsdWUsIHN0ZXAsIGRpbSA9IG51bGwsIHRleHRGaWVsZD0gbnVsbCkgLT5cbiAgICBpZiBuYW1lLm1hdGNoKC9uYXYvKVxuICAgICAgIyBOb3RlOiB3ZSBjYW4gaGF2ZSBtb3JlIHRoYW4gb25lIHZpZXcgcGVyIGRpbWVuc2lvbiFcbiAgICAgIHZpZXdzID0gKHYgZm9yIHYgaW4gQHZpZXdzIHdoZW4gdi5kaW0gPT0gZGltKVxuICAgICAgZm9yIHYgaW4gdmlld3NcbiAgICAgICAgdi5hZGRTbGlkZXIobmFtZSwgZWxlbWVudCwgb3JpZW50YXRpb24sIG1pbiwgbWF4LCB2YWx1ZSwgc3RlcCwgdGV4dEZpZWxkKVxuICAgIGVsc2VcbiAgICAgIEB1c2VySW50ZXJmYWNlLmFkZFNsaWRlcihuYW1lLCBlbGVtZW50LCBvcmllbnRhdGlvbiwgbWluLCBtYXgsIHZhbHVlLCBzdGVwLCB0ZXh0RmllbGQpXG5cbiAgYWRkVGV4dEZpZWxkOiAobmFtZSwgZWxlbWVudCkgLT5cbiAgICBAdXNlckludGVyZmFjZS5hZGRUZXh0RmllbGQobmFtZSwgZWxlbWVudClcblxuICBhZGREYXRhRmllbGQ6IChuYW1lLCBlbGVtZW50KSAtPlxuICAgIEBkYXRhUGFuZWwuYWRkRGF0YUZpZWxkKG5hbWUsIGVsZW1lbnQpXG5cbiAgYWRkQXhpc1Bvc2l0aW9uRmllbGQ6IChuYW1lLCBlbGVtZW50LCBkaW0pIC0+XG4gICAgQGRhdGFQYW5lbC5hZGRBeGlzUG9zaXRpb25GaWVsZChuYW1lLCBlbGVtZW50LCBkaW0pXG5cblxuICBhZGRDb2xvclNlbGVjdDogKGVsZW1lbnQpIC0+XG4gICAgQHVzZXJJbnRlcmZhY2UuYWRkQ29sb3JTZWxlY3QoZWxlbWVudClcblxuXG4gIGFkZFNpZ25TZWxlY3Q6IChlbGVtZW50KSAtPlxuICAgIEB1c2VySW50ZXJmYWNlLmFkZFNpZ25TZWxlY3QoZWxlbWVudClcblxuXG4gICMgQWRkIGNoZWNrYm94ZXMgZm9yIGVuYWJsaW5nL2Rpc2FibGluZyBzZXR0aW5ncyBpbiB0aGUgVmlld1NldHRpbmdzIG9iamVjdC5cbiAgIyBFbGVtZW50IGlzIHRoZSBIVE1MIGVsZW1lbnQgdG8gaG9sZCB0aGUgYm94ZXM7IHNldHRpbmdzIGlzIGFuIGFycmF5IG9mIFxuICAjIHNldHRpbmdzIHRvIGFkZCBhIGJveCBmb3IuIElmIHNldHRpbmdzID09ICdzdGFuZGFyZCcsIGNyZWF0ZSBhIHN0YW5kYXJkIFxuICAjIHNldCBvZiBib3hlcy5cbiAgYWRkU2V0dGluZ3NDaGVja2JveGVzOiAoZWxlbWVudCwgb3B0aW9ucykgLT5cbiAgICBvcHRpb25zID0gWydjcm9zc2hhaXJzJywgJ3Bhbnpvb20nLCAnbGFiZWxzJ10gaWYgb3B0aW9ucyA9PSAnc3RhbmRhcmQnXG4gICAgc2V0dGluZ3MgPSB7fVxuICAgIG9wdGlvbnMgPSAobyBmb3IgbyBpbiBvcHRpb25zIHdoZW4gbyBpbiBbJ2Nyb3NzaGFpcnMnLCAncGFuem9vbScsICdsYWJlbHMnXSlcbiAgICBmb3IgbyBpbiBvcHRpb25zXG4gICAgICBzZXR0aW5nc1tvXSA9IEB2aWV3U2V0dGluZ3NbbyArICdFbmFibGVkJ11cbiAgICBAdXNlckludGVyZmFjZS5hZGRTZXR0aW5nc0NoZWNrYm94ZXMoZWxlbWVudCwgc2V0dGluZ3MpXG5cblxuICBfbG9hZEltYWdlOiAoZGF0YSwgb3B0aW9ucykgLT5cbiAgICBsYXllciA9IG5ldyBMYXllcihuZXcgSW1hZ2UoZGF0YSksIG9wdGlvbnMpXG4gICAgQGxheWVyTGlzdC5hZGRMYXllcihsYXllcilcbiAgICB0cnlcbiAgICAgIGFtcGxpZnkuc3RvcmUobGF5ZXIubmFtZSwgZGF0YSkgaWYgQGNhY2hlIGFuZCBvcHRpb25zLmNhY2hlXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgIFwiXCJcblxuXG4gIF9sb2FkSW1hZ2VGcm9tSlNPTjogKG9wdGlvbnMpIC0+XG4gICAgcmV0dXJuICQuZ2V0SlNPTihvcHRpb25zLnVybCwgKGRhdGEpID0+XG4gICAgICAgIEBfbG9hZEltYWdlKGRhdGEsIG9wdGlvbnMpXG4gICAgICApXG5cblxuICBfbG9hZEltYWdlRnJvbVZvbHVtZTogKG9wdGlvbnMpIC0+XG4gICAgZGZkID0gJC5EZWZlcnJlZCgpXG4gICAgIyB4dGsgcmVxdWlyZXMgdXMgdG8gaW5pdGlhbGl6ZSBhIHJlbmRlcmVyIGFuZCBkcmF3IGl0IHRvIHRoZSB2aWV3LFxuICAgICMgc28gY3JlYXRlIGEgZHVtbXkgaGlkZGVuIGRpdiBhcyB0aGUgY29udGFpbmVyLlxuICAgICQoJ2JvZHknKS5hcHBlbmQoXCI8ZGl2IGlkPSd4dGtfdG1wJyBzdHlsZT0nZGlzcGxheTogbm9uZTsnPjwvZGl2PlwiKVxuICAgIHIgPSBuZXcgWC5yZW5kZXJlcjJEKClcbiAgICByLmNvbnRhaW5lciA9ICd4dGtfdG1wJ1xuICAgIHIub3JpZW50YXRpb24gPSAnWCc7XG4gICAgci5pbml0KClcbiAgICAjIERpc2FibGUgYWxsIGludGVyYWN0aW9ucyBzbyB0aGV5IGRvbid0IGludGVyZmVyZSB3aXRoIG90aGVyIGFzcGVjdHMgb2YgdGhlIGFwcFxuICAgIHIuaW50ZXJhY3Rvci5jb25maWcuS0VZQk9BUkRfRU5BQkxFRCA9IGZhbHNlXG4gICAgci5pbnRlcmFjdG9yLmNvbmZpZy5NT1VTRUNMSUNLU19FTkFCTEVEID0gZmFsc2VcbiAgICByLmludGVyYWN0b3IuY29uZmlnLk1PVVNFV0hFRUxfRU5BQkxFRCA9IGZhbHNlXG4gICAgci5pbnRlcmFjdG9yLmluaXQoKVxuXG5cbiAgICB2ID0gbmV3IFgudm9sdW1lKClcbiAgICAjIEtsdWRnZTogeHRrIGRldGVybWluZXMgd2hpY2ggcGFyc2VyIHRvIGNhbGwgYmFzZWQgb24gcmVxdWVzdCBleHRlbnNpb25cbiAgICB2LmZpbGUgPSBvcHRpb25zLnVybCArICc/Lm5paS5neidcbiAgICByLmFkZCB2XG4gICAgci5yZW5kZXIoKVxuICAgIHIub25TaG93dGltZSA9ID0+XG4gICAgICByLmRlc3Ryb3koKVxuICAgICAgZGF0YSA9IHtcbiAgICAgICAgZGF0YTNkOiB2LmltYWdlXG4gICAgICAgIGRpbXM6IHYuZGltZW5zaW9uc1xuICAgICAgfVxuICAgICAgQF9sb2FkSW1hZ2UoZGF0YSwgb3B0aW9ucylcbiAgICAgICQoJyN4dGtfdG1wJykucmVtb3ZlKClcbiAgICAgIGRmZC5yZXNvbHZlKCdGaW5pc2hlZCBsb2FkaW5nIGZyb20gdm9sdW1lJylcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuXG5cbiAgbG9hZEltYWdlczogKGltYWdlcywgYWN0aXZhdGUgPSBudWxsLCBwYWludCA9IHRydWUsIGFzc2lnbkNvbG9ycyA9IGZhbHNlKSAtPlxuICAgICMjIyBMb2FkIG9uZSBvciBtb3JlIGltYWdlcy4gSWYgYWN0aXZhdGUgaXMgYW4gaW50ZWdlciwgYWN0aXZhdGUgdGhlIGxheWVyIGF0IHRoYXQgXG4gICAgaW5kZXguIE90aGVyd2lzZSBhY3RpdmF0ZSB0aGUgbGFzdCBsYXllciBpbiB0aGUgbGlzdCBieSBkZWZhdWx0LiBXaGVuIGFzc2lnbkNvbG9ycyBcbiAgICBpcyB0cnVlLCB2aWV3ZXIgd2lsbCBsb2FkIGVhY2ggaW1hZ2Ugd2l0aCB0aGUgbmV4dCBhdmFpbGFibGUgY29sb3IgcGFsZXR0ZSB1bmxlc3MgXG4gICAgY29sb3IgaXMgZXhwbGljaXRseSBzcGVjaWZpZWQuICMjI1xuXG4gICAgIyBXcmFwIHNpbmdsZSBpbWFnZSBpbiBhbiBhcnJheVxuICAgIGlmIG5vdCB0eXBlSXNBcnJheShpbWFnZXMpXG4gICAgICBpbWFnZXMgPSBbaW1hZ2VzXVxuXG4gICAgYWpheFJlcXMgPSBbXSAgICMgU3RvcmUgYWxsIGFqYXggcmVxdWVzdHMgc28gd2UgY2FuIGNhbGwgYSB3aGVuKCkgb24gdGhlIFByb21pc2VzXG5cbiAgICAjIFJlbW92ZSBpbWFnZXMgdGhhdCBhcmUgYWxyZWFkeSBsb2FkZWQuIEZvciBub3csIG1hdGNoIG9uIG5hbWU7IGV2ZW50dWFsbHkgXG4gICAgIyBzaG91bGQgZmluZCBhIGJldHRlciB3YXkgdG8gZGVmaW5lIHVuaXF1ZW5lc3MsIG9yIGFsbG93IHVzZXIgdG8gb3ZlcndyaXRlXG4gICAgIyBleGlzdGluZyBpbWFnZXMuXG4gICAgZXhpc3RpbmdMYXllcnMgPSBAbGF5ZXJMaXN0LmdldExheWVyTmFtZXMoKVxuICAgIGltYWdlcyA9IChpbWcgZm9yIGltZyBpbiBpbWFnZXMgd2hlbiBpbWcubmFtZSBub3QgaW4gZXhpc3RpbmdMYXllcnMpXG5cbiAgICBmb3IgaW1nIGluIGltYWdlc1xuICAgICAgIyBBc3NpZ24gbmV4dCBhdmFpbGFibGUgY29sb3JcbiAgICAgIGlmIGFzc2lnbkNvbG9ycyBhbmQgIWltZy5jb2xvclBhbGV0dGU/XG4gICAgICAgIGltZy5jb2xvclBhbGV0dGUgPSBAbGF5ZXJMaXN0LmdldE5leHRDb2xvcigpXG4gICAgICAjIElmIGltYWdlIGRhdGEgaXMgYWxyZWFkeSBwcmVzZW50LCBvciB3ZSBjYW4gcmV0cmlldmUgaXQgZnJvbSB0aGUgY2FjaGUsXG4gICAgICAjIGluaXRpYWxpemUgdGhlIGxheWVyLiBPdGhlcndpc2UgbWFrZSBhIEpTT04gY2FsbC5cbiAgICAgIGlmIChkYXRhID0gaW1nLmRhdGEpIG9yIChAY2FjaGUgYW5kIChkYXRhID0gQGNhY2hlKGltZy5uYW1lKSkpXG4gICAgICAgIEBfbG9hZEltYWdlKGRhdGEsIGltZylcbiAgICAgICMgSWYgdGhlIHVybCBleHRlbnNpb24gaXMgSlNPTiwgb3IganNvbiBpcyBtYW51YWxseSBmb3JjZWQgYnkgc3BlY2lmeWluZ1xuICAgICAgIyBqc29uID0gdHJ1ZSBpbiBpbWFnZSBvcHRpb25zLCBtYWtlIGFqYXggY2FsbFxuICAgICAgZWxzZSBpZiBpbWcudXJsLm1hdGNoKC9cXC5qc29uJC8pIG9yIGltZy5qc29uXG4gICAgICAgIGFqYXhSZXFzLnB1c2goQF9sb2FkSW1hZ2VGcm9tSlNPTihpbWcpKVxuICAgICAgIyBPdGhlcndpc2UgYXNzdW1lIFVSTCBwb2ludHMgdG8gYSB2b2x1bWUgYW5kIGxvYWQgZnJvbSBmaWxlXG4gICAgICBlbHNlXG4gICAgICAgIGFqYXhSZXFzLnB1c2goQF9sb2FkSW1hZ2VGcm9tVm9sdW1lKGltZykpXG5cbiAgICAjIFJlb3JkZXIgbGF5ZXJzIG9uY2UgYXN5bmNocm9ub3VzIGNhbGxzIGFyZSBmaW5pc2hlZFxuICAgICQud2hlbi5hcHBseSgkLCBhamF4UmVxcykudGhlbiggPT5cbiAgICAgIG9yZGVyID0gKGkubmFtZSBmb3IgaSBpbiBpbWFnZXMpXG4gICAgICBAc29ydExheWVycyhvcmRlci5yZXZlcnNlKCkpXG4gICAgICBAc2VsZWN0TGF5ZXIoYWN0aXZhdGUgPz0gMClcbiAgICAgIEB1cGRhdGVVc2VySW50ZXJmYWNlKClcbiAgICAgICQoQCkudHJpZ2dlcignaW1hZ2VzTG9hZGVkJykgICMgVHJpZ2dlciBldmVudFxuICAgIClcbiAgICAgICAgXG5cbiAgY2xlYXJJbWFnZXM6ICgpIC0+XG4gICAgQGxheWVyTGlzdC5jbGVhckxheWVycygpXG4gICAgQHVwZGF0ZVVzZXJJbnRlcmZhY2UoKVxuICAgIEBjbGVhcigpXG4gICAgJChAKS50cmlnZ2VyKCdpbWFnZXNDbGVhcmVkJylcblxuXG4gIGRvd25sb2FkSW1hZ2U6IChpbmRleCkgLT5cbiAgICB1cmwgPSBAbGF5ZXJMaXN0LmxheWVyc1tpbmRleF0uZG93bmxvYWRcbiAgICB3aW5kb3cubG9jYXRpb24ucmVwbGFjZSh1cmwpIGlmIHVybFxuXG5cbiAgc2VsZWN0TGF5ZXI6IChpbmRleCkgLT5cbiAgICBAbGF5ZXJMaXN0LmFjdGl2YXRlTGF5ZXIoaW5kZXgpXG4gICAgQHVzZXJJbnRlcmZhY2UudXBkYXRlTGF5ZXJTZWxlY3Rpb24oQGxheWVyTGlzdC5nZXRBY3RpdmVJbmRleCgpKVxuICAgIEB1cGRhdGVEYXRhRGlzcGxheSgpXG4gICAgQHVzZXJJbnRlcmZhY2UudXBkYXRlVGhyZXNob2xkU2xpZGVycyhAbGF5ZXJMaXN0LmFjdGl2ZUxheWVyLmltYWdlKVxuICAgIEB1c2VySW50ZXJmYWNlLnVwZGF0ZUNvbXBvbmVudHMoQGxheWVyTGlzdC5hY3RpdmVMYXllci5nZXRTZXR0aW5ncygpKVxuICAgICQoQCkudHJpZ2dlcignbGF5ZXJTZWxlY3RlZCcpXG5cblxuICBkZWxldGVMYXllcjogKHRhcmdldCkgLT5cbiAgICBAbGF5ZXJMaXN0LmRlbGV0ZUxheWVyKHRhcmdldClcbiAgICBAdXBkYXRlVXNlckludGVyZmFjZSgpXG4gICAgJChAKS50cmlnZ2VyKCdsYXllckRlbGV0ZWQnKVxuXG5cbiAgdG9nZ2xlTGF5ZXI6IChpbmRleCkgLT5cbiAgICBAbGF5ZXJMaXN0LmxheWVyc1tpbmRleF0udG9nZ2xlKClcbiAgICBAdXNlckludGVyZmFjZS51cGRhdGVMYXllclZpc2liaWxpdHkoQGxheWVyTGlzdC5nZXRMYXllclZpc2liaWxpdGllcygpKSBcbiAgICBAcGFpbnQoKVxuICAgICQoQCkudHJpZ2dlcignbGF5ZXJUb2dnbGVkJylcblxuXG4gIHNvcnRMYXllcnM6IChsYXllcnMsIHBhaW50ID0gZmFsc2UpIC0+XG4gICAgQGxheWVyTGlzdC5zb3J0TGF5ZXJzKGxheWVycylcbiAgICBAdXNlckludGVyZmFjZS51cGRhdGVMYXllclZpc2liaWxpdHkoQGxheWVyTGlzdC5nZXRMYXllclZpc2liaWxpdGllcygpKVxuICAgIEBwYWludCgpIGlmIHBhaW50XG5cblxuICAjIENhbGwgYWZ0ZXIgYW55IG9wZXJhdGlvbiBpbnZvbHZpbmcgY2hhbmdlIHRvIGxheWVyc1xuICB1cGRhdGVVc2VySW50ZXJmYWNlOiAoKSAtPlxuICAgIEB1c2VySW50ZXJmYWNlLnVwZGF0ZUxheWVyTGlzdChAbGF5ZXJMaXN0LmdldExheWVyTmFtZXMoKSwgQGxheWVyTGlzdC5nZXRBY3RpdmVJbmRleCgpKVxuICAgIEB1c2VySW50ZXJmYWNlLnVwZGF0ZUxheWVyVmlzaWJpbGl0eShAbGF5ZXJMaXN0LmdldExheWVyVmlzaWJpbGl0aWVzKCkpXG4gICAgQHVzZXJJbnRlcmZhY2UudXBkYXRlTGF5ZXJTZWxlY3Rpb24oQGxheWVyTGlzdC5nZXRBY3RpdmVJbmRleCgpKVxuICAgIGlmIEBsYXllckxpc3QuYWN0aXZlTGF5ZXI/XG4gICAgICBAdXNlckludGVyZmFjZS51cGRhdGVDb21wb25lbnRzKEBsYXllckxpc3QuYWN0aXZlTGF5ZXIuZ2V0U2V0dGluZ3MoKSlcbiAgICBAcGFpbnQoKVxuXG5cbiAgdXBkYXRlU2V0dGluZ3M6IChzZXR0aW5ncykgLT5cbiAgICBAbGF5ZXJMaXN0LnVwZGF0ZUFjdGl2ZUxheWVyKHNldHRpbmdzKVxuICAgIEBwYWludCgpXG5cblxuICB1cGRhdGVEYXRhRGlzcGxheTogLT5cbiAgICAjIEdldCBhY3RpdmUgbGF5ZXIgYW5kIGV4dHJhY3QgY3VycmVudCB2YWx1ZSwgY29vcmRpbmF0ZXMsIGV0Yy5cbiAgICBhY3RpdmVMYXllciA9IEBsYXllckxpc3QuYWN0aXZlTGF5ZXJcbiAgICBbeCwgeSwgel0gPSBAY29vcmRzX2lqa1xuICAgIGN1cnJlbnRWYWx1ZSA9IGFjdGl2ZUxheWVyLmltYWdlLmRhdGFbel1beV1beF1cbiAgICBjdXJyZW50Q29vcmRzID0gVHJhbnNmb3JtLmltYWdlVG9BdGxhcyhAY29vcmRzX2lqay5zbGljZSgwKSkuam9pbignLCAnKVxuXG4gICAgZGF0YSA9XG4gICAgICB2b3hlbFZhbHVlOiBjdXJyZW50VmFsdWVcbiAgICAgIGN1cnJlbnRDb29yZHM6IGN1cnJlbnRDb29yZHNcblxuICAgIEBkYXRhUGFuZWwudXBkYXRlKGRhdGEpXG5cblxuICB1cGRhdGVWaWV3U2V0dGluZ3M6IChvcHRpb25zLCBwYWludCA9IGZhbHNlKSAtPlxuICAgIEB2aWV3U2V0dGluZ3MudXBkYXRlU2V0dGluZ3Mob3B0aW9ucylcbiAgICBAcGFpbnQoKSBpZiBwYWludFxuXG5cbiAgIyBVcGRhdGUgdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uIGluIDNEIHNwYWNlXG4gIG1vdmVUb1ZpZXdlckNvb3JkczogKGRpbSwgY3gsIGN5ID0gbnVsbCkgLT5cbiAgICAjIElmIGJvdGggY3ggYW5kIGN5IGFyZSBwYXNzZWQsIHRoaXMgaXMgYSAyRCB1cGRhdGUgZnJvbSBhIGNsaWNrKClcbiAgICAjIGV2ZW50IGluIHRoZSB2aWV3LiBPdGhlcndpc2Ugd2UgdXBkYXRlIG9ubHkgMSBkaW1lbnNpb24uXG4gICAgJChAKS50cmlnZ2VyKCdiZWZvcmVMb2NhdGlvbkNoYW5nZScpXG4gICAgaWYgY3k/XG4gICAgICBjeHl6ID0gW2N4LCBjeV1cbiAgICAgIGN4eXouc3BsaWNlKGRpbSwgMCwgQGNvb3Jkc19hYmNbZGltXSlcbiAgICBlbHNlXG4gICAgICBjeHl6ID0gQGNvb3Jkc19hYmNcbiAgICAgIGN4eXpbZGltXSA9IGN4XG4gICAgQGNvb3Jkc19hYmMgPSBjeHl6XG4gICAgQGNvb3Jkc19pamsgPSBUcmFuc2Zvcm0uYXRsYXNUb0ltYWdlKFRyYW5zZm9ybS52aWV3ZXJUb0F0bGFzKEBjb29yZHNfYWJjKSlcbiAgICBAcGFpbnQoKVxuICAgICQoQCkudHJpZ2dlcignYWZ0ZXJMb2NhdGlvbkNoYW5nZScpXG5cblxuICBtb3ZlVG9BdGxhc0Nvb3JkczogKGNvb3JkcywgcGFpbnQgPSB0cnVlKSAtPlxuICAgIEBjb29yZHNfaWprID0gVHJhbnNmb3JtLmF0bGFzVG9JbWFnZShjb29yZHMpXG4gICAgQGNvb3Jkc19hYmMgPSBUcmFuc2Zvcm0uYXRsYXNUb1ZpZXdlcihjb29yZHMpXG4gICAgQHBhaW50KCkgaWYgcGFpbnRcblxuXG4gIGRlbGV0ZVZpZXc6ICAoaW5kZXgpIC0+XG4gICAgQHZpZXdzLnNwbGljZShpbmRleCwgMSlcblxuXG4gIGpRdWVyeUluaXQ6ICgpIC0+XG4gICAgQHVzZXJJbnRlcmZhY2UualF1ZXJ5SW5pdCgpXG5cbiIsIlxuY2xhc3MgSW1hZ2VcblxuICBjb25zdHJ1Y3RvcjogKGRhdGEpIC0+XG5cbiAgICAjIERpbWVuc2lvbnMgb2YgaW1hZ2UgbXVzdCBhbHdheXMgYmUgcGFzc2VkXG4gICAgW0B4LCBAeSwgQHpdID0gZGF0YS5kaW1zXG5cbiAgICAjIEltYWdlcyBsb2FkZWQgZnJvbSBhIGJpbmFyeSB2b2x1bWUgYWxyZWFkeSBoYXZlIDNEIGRhdGEsIGFuZCB3ZSBcbiAgICAjIGp1c3QgbmVlZCB0byBjbGVhbiB1cCB2YWx1ZXMgYW5kIHN3YXAgYXhlcyAodG8gcmV2ZXJzZSB4IGFuZCB6IFxuICAgICMgcmVsYXRpdmUgdG8geHRrKS5cbiAgICBpZiAnZGF0YTNkJyBvZiBkYXRhXG4gICAgICBAbWluID0gMFxuICAgICAgQG1heCA9IDBcbiAgICAgIEBkYXRhID0gW11cbiAgICAgIGZvciBpIGluIFswLi4uQHhdXG4gICAgICAgIEBkYXRhW2ldID0gW11cbiAgICAgICAgZm9yIGogaW4gWzAuLi5AeV1cbiAgICAgICAgICBAZGF0YVtpXVtqXSA9IFtdXG4gICAgICAgICAgZm9yIGsgaW4gWzAuLi5Ael1cbiAgICAgICAgICAgIHZhbHVlID0gTWF0aC5yb3VuZChkYXRhLmRhdGEzZFtpXVtqXVtrXSoxMDApLzEwMFxuICAgICAgICAgICAgQG1heCA9IHZhbHVlIGlmIHZhbHVlID4gQG1heFxuICAgICAgICAgICAgQG1pbiA9IHZhbHVlIGlmIHZhbHVlIDwgQG1pblxuICAgICAgICAgICAgQGRhdGFbaV1bal1ba10gPSB2YWx1ZVxuXG4gICAgIyBMb2FkIGZyb20gSlNPTiBmb3JtYXQuIFRoZSBmb3JtYXQgaXMga2luZCBvZiBjbHVua3kgYW5kIGNvdWxkIGJlIGltcHJvdmVkLlxuICAgIGVsc2UgaWYgJ3ZhbHVlcycgb2YgZGF0YVxuICAgICAgW0BtYXgsIEBtaW5dID0gW2RhdGEubWF4LCBkYXRhLm1pbl1cbiAgICAgIHZlYyA9IFRyYW5zZm9ybS5qc29uVG9WZWN0b3IoZGF0YSlcbiAgICAgIEBkYXRhID0gVHJhbnNmb3JtLnZlY3RvclRvVm9sdW1lKHZlYywgW0B4LCBAeSwgQHpdKVxuXG4gICAgIyBPdGhlcndpc2UgaW5pdGlhbGl6ZSBhIGJsYW5rIGltYWdlLlxuICAgIGVsc2VcbiAgICAgIEBtaW4gPSAwXG4gICAgICBAbWF4ID0gMFxuICAgICAgQGRhdGEgPSBAZW1wdHkoKVxuXG4gICAgIyBJZiBwZWFrcyBhcmUgcGFzc2VkLCBjb25zdHJ1Y3Qgc3BoZXJlcyBhcm91bmQgdGhlbVxuICAgIGlmICdwZWFrcycgb2YgZGF0YVxuICAgICAgQGFkZFNwaGVyZShUcmFuc2Zvcm0uYXRsYXNUb0ltYWdlKFtwLngsIHAueSwgcC56XSksIHAuciA/PSAzLCBwLnZhbHVlID89IDEpIGZvciBwIGluIGRhdGEucGVha3NcbiAgICAgIEBtYXggPSAyICAgIyBWZXJ5IHN0cmFuZ2UgYnVnIGNhdXNlcyBwcm9ibGVtIGlmIEBtYXggaXMgPCB2YWx1ZSBpbiBhZGRTcGhlcmUoKTtcbiAgICAgICAgICAgICAjIHNldHRpbmcgdG8gdHdpY2UgdGhlIHZhbHVlIHNlZW1zIHRvIHdvcmsuXG5cblxuICAjIFJldHVybiBhbiBlbXB0eSB2b2x1bWUgb2YgY3VycmVudCBpbWFnZSBkaW1lbnNpb25zXG4gIGVtcHR5OiAoKSAtPlxuICAgIHZvbCA9IFtdXG4gICAgZm9yIGkgaW4gWzAuLi5AeF1cbiAgICAgIHZvbFtpXSA9IFtdXG4gICAgICBmb3IgaiBpbiBbMC4uLkB5XVxuICAgICAgICB2b2xbaV1bal0gPSBbXVxuICAgICAgICBmb3IgayBpbiBbMC4uLkB6XVxuICAgICAgICAgIHZvbFtpXVtqXVtrXSA9IDBcbiAgICByZXR1cm4gdm9sXG5cblxuICAjIEFkZCBhIHNwaGVyZSBvZiByYWRpdXMgciBhdCB0aGUgcHJvdmlkZWQgY29vcmRpbmF0ZXMuIENvb3JkaW5hdGVzIGFyZSBzcGVjaWZpZWRcbiAgIyBpbiBpbWFnZSBzcGFjZSAoaS5lLiwgd2hlcmUgeC95L3ogYXJlIGluZGV4ZWQgZnJvbSAwIHRvIHRoZSBudW1iZXIgb2Ygdm94ZWxzIGluXG4gICMgZWFjaCBwbGFuZSkuXG4gIGFkZFNwaGVyZTogKGNvb3JkcywgciwgdmFsdWU9MSkgLT5cbiAgICByZXR1cm4gaWYgciA8PSAwXG4gICAgW3gsIHksIHpdID0gY29vcmRzLnJldmVyc2UoKVxuICAgIHJldHVybiB1bmxlc3MgeD8gYW5kIHk/IGFuZCB6P1xuICAgIGZvciBpIGluIFstci4ucl1cbiAgICAgIGNvbnRpbnVlIGlmICh4LWkpIDwgMCBvciAoeCtpKSA+IChAeCAtIDEpXG4gICAgICBmb3IgaiBpbiBbLXIuLnJdXG4gICAgICAgIGNvbnRpbnVlIGlmICh5LWopIDwgMCBvciAoeStqKSA+IChAeSAtIDEpXG4gICAgICAgIGZvciBrIGluIFstci4ucl1cbiAgICAgICAgICBjb250aW51ZSBpZiAoei1rKSA8IDAgb3IgKHoraykgPiAoQHogLSAxKVxuICAgICAgICAgIGRpc3QgPSBpKmkgKyBqKmogKyBrKmtcbiAgICAgICAgICBAZGF0YVtpK3hdW2oreV1bayt6XSA9IHZhbHVlIGlmIGRpc3QgPCByKnJcbiAgICByZXR1cm4gZmFsc2VcblxuXG4gICMgTmVlZCB0byBpbXBsZW1lbnQgcmVzYW1wbGluZyB0byBhbGxvdyBkaXNwbGF5IG9mIGltYWdlcyBvZiBkaWZmZXJlbnQgcmVzb2x1dGlvbnNcbiAgcmVzYW1wbGU6IChuZXd4LCBuZXd5LCBuZXd6KSAtPlxuXG5cbiAgIyBTbGljZSB0aGUgdm9sdW1lIGFsb25nIHRoZSBzcGVjaWZpZWQgZGltZW5zaW9uICgwID0geCwgMSA9IHksIDIgPSB6KSBhdCB0aGVcbiAgIyBzcGVjaWZpZWQgaW5kZXggYW5kIHJldHVybiBhIDJEIGFycmF5LlxuICBzbGljZTogKGRpbSwgaW5kZXgpIC0+XG4gICAgc3dpdGNoIGRpbVxuICAgICAgICB3aGVuIDBcbiAgICAgICAgICBzbGljZSA9IFtdXG4gICAgICAgICAgZm9yIGkgaW4gWzAuLi5AeF1cbiAgICAgICAgICAgIHNsaWNlW2ldID0gW11cbiAgICAgICAgICAgIGZvciBqIGluIFswLi4uQHldXG4gICAgICAgICAgICAgIHNsaWNlW2ldW2pdID0gQGRhdGFbaV1bal1baW5kZXhdXG4gICAgICAgIHdoZW4gMVxuICAgICAgICAgIHNsaWNlID0gW11cbiAgICAgICAgICBmb3IgaSBpbiBbMC4uLkB4XVxuICAgICAgICAgICAgc2xpY2VbaV0gPSBAZGF0YVtpXVtpbmRleF1cbiAgICAgICAgd2hlbiAyXG4gICAgICAgICAgc2xpY2UgPSBAZGF0YVtpbmRleF1cbiAgICByZXR1cm4gc2xpY2VcblxuICBkaW1zOiAtPlxuICAgIHJldHVybiBbQHgsIEB5LCBAel1cblxuXG5cbmNsYXNzIExheWVyXG4gIFxuICAjIEluIGFkZGl0aW9uIHRvIGJhc2ljIHByb3BlcnRpZXMgd2UgYXR0YWNoIHRvIGN1cnJlbnQgTGF5ZXIgaW5zdGFuY2UsXG4gICMgc2F2ZSB0aGUgb3B0aW9ucyBoYXNoIGl0c2VsZi4gVGhpcyBhbGxvd3MgdXNlcnMgdG8gZXh0ZW5kIHRoZSBcbiAgIyB2aWV3ZXIgYnkgcGFzc2luZyBjdXN0b20gb3B0aW9uczsgZS5nLiwgaW1hZ2VzIGNhbiBzdG9yZSBhICdkb3dubG9hZCdcbiAgIyBwYXJhbWV0ZXIgdGhhdCBpbmRpY2F0ZXMgd2hldGhlciBlYWNoIGltYWdlIGNhbiBiZSBkb3dubG9hZGVkIG9yIG5vdC5cbiAgY29uc3RydWN0b3I6IChAaW1hZ2UsIG9wdGlvbnMpIC0+XG5cbiAgICAjIEltYWdlIGRlZmF1bHRzXG4gICAgb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHtcbiAgICAgIGNvbG9yUGFsZXR0ZTogJ3JlZCdcbiAgICAgIHNpZ246ICdwb3NpdGl2ZSdcbiAgICAgIHZpc2libGU6IHRydWVcbiAgICAgIG9wYWNpdHk6IDEuMFxuICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICBkb3dubG9hZDogZmFsc2VcbiAgICAgIHBvc2l0aXZlVGhyZXNob2xkOiAwXG4gICAgICBuZWdhdGl2ZVRocmVzaG9sZDogMFxuICAgICAgZGVzY3JpcHRpb246ICcnXG4gICAgICBpbnRlbnQ6ICdWYWx1ZTonICAjIFRoZSBtZWFuaW5nIG9mIHRoZSB2YWx1ZXMgaW4gdGhlIGltYWdlXG4gICAgICB9LCBvcHRpb25zKVxuXG4gICAgQG5hbWUgPSBvcHRpb25zLm5hbWVcbiAgICBAc2lnbiA9IG9wdGlvbnMuc2lnblxuICAgIEBjb2xvck1hcCA9IEBzZXRDb2xvck1hcChvcHRpb25zLmNvbG9yUGFsZXR0ZSlcbiAgICBAdmlzaWJsZSA9IG9wdGlvbnMudmlzaWJsZVxuICAgIEB0aHJlc2hvbGQgPSBAc2V0VGhyZXNob2xkKG9wdGlvbnMubmVnYXRpdmVUaHJlc2hvbGQsIG9wdGlvbnMucG9zaXRpdmVUaHJlc2hvbGQpXG4gICAgQG9wYWNpdHkgPSBvcHRpb25zLm9wYWNpdHlcbiAgICBAZG93bmxvYWQgPSBvcHRpb25zLmRvd25sb2FkXG4gICAgQGludGVudCA9IG9wdGlvbnMuaW50ZW50XG4gICAgQGRlc2NyaXB0aW9uID0gb3B0aW9ucy5kZXNjcmlwdGlvblxuXG5cbiAgaGlkZTogLT5cbiAgICBAdmlzaWJsZSA9IGZhbHNlXG5cblxuICBzaG93OiAtPlxuICAgIEB2aXNpYmxlID0gdHJ1ZVxuXG5cbiAgdG9nZ2xlOiAtPlxuICAgIEB2aXNpYmxlID0gIUB2aXNpYmxlXG5cblxuICBzbGljZTogKHZpZXcsIHZpZXdlcikgLT5cbiAgICAjIGdldCB0aGUgcmlnaHQgMkQgc2xpY2UgZnJvbSB0aGUgSW1hZ2VcbiAgICBkYXRhID0gQGltYWdlLnNsaWNlKHZpZXcuZGltLCB2aWV3ZXIuY29vcmRzX2lqa1t2aWV3LmRpbV0pXG4gICAgIyBUaHJlc2hvbGQgaWYgbmVlZGVkXG4gICAgZGF0YSA9IEB0aHJlc2hvbGQubWFzayhkYXRhKVxuICAgIHJldHVybiBkYXRhXG5cblxuICBzZXRDb2xvck1hcDogKHBhbGV0dGUgPSBudWxsLCBzdGVwcyA9IG51bGwpIC0+XG4gICAgQHBhbGV0dGUgPSBwYWxldHRlXG4gICAgIyBDb2xvciBtYXBwaW5nIGhlcmUgaXMgYSBiaXQgbm9uLWludHVpdGl2ZSwgYnV0IHByb2R1Y2VzXG4gICAgIyBuaWNlciByZXN1bHRzIGZvciB0aGUgZW5kIHVzZXIuXG4gICAgaWYgQHNpZ24gPT0gJ2JvdGgnXG4gICAgICAjIyMgSW5zdGVhZCBvZiB1c2luZyB0aGUgYWN0dWFsIG1pbi9tYXggcmFuZ2UsIHdlIGZpbmQgdGhlXG4gICAgICBsYXJnZXN0IGFic29sdXRlIHZhbHVlIGFuZCB1c2UgdGhhdCBhcyB0aGUgYm91bmQgZm9yXG4gICAgICBib3RoIHNpZ25zLiBUaGlzIHByZXNlcnZlcyBjb2xvciBtYXBzIHdoZXJlIDAgaXNcbiAgICAgIG1lYW5pbmdmdWw7IGUuZy4sIGZvciBob3QgYW5kIGNvbGQsIHdlIHdhbnQgYmx1ZXMgdG9cbiAgICAgIGJlIG5lZ2F0aXZlIGFuZCByZWRzIHRvIGJlIHBvc2l0aXZlIGV2ZW4gd2hlblxuICAgICAgYWJzKG1pbikgYW5kIGFicyhtYXgpIGFyZSBxdWl0ZSBkaWZmZXJlbnQuXG4gICAgICBCVVQgaWYgbWluIG9yIG1heCBhcmUgMCwgdGhlbiBpbXBsaWNpdGx5IGZhbGwgYmFjayB0b1xuICAgICAgdHJlYXRpbmcgbW9kZSBhcyBpZiBpdCB3ZXJlICdwb3NpdGl2ZScgb3IgJ25lZ2F0aXZlJyAjIyNcbiAgICAgIG1heEFicyA9IE1hdGgubWF4KEBpbWFnZS5taW4sIEBpbWFnZS5tYXgpXG4gICAgICBtaW4gPSBpZiBAaW1hZ2UubWluID09IDAgdGhlbiAwIGVsc2UgLW1heEFic1xuICAgICAgbWF4ID0gaWYgQGltYWdlLm1heCA9PSAwIHRoZW4gMCBlbHNlIG1heEFic1xuICAgIGVsc2VcbiAgICAgICMgSWYgdXNlciB3YW50cyBqdXN0IG9uZSBzaWduLCBtYXNrIG91dCB0aGUgb3RoZXIgYW5kXG4gICAgICAjIGNvbXByZXNzIHRoZSBlbnRpcmUgY29sb3IgcmFuZ2UgaW50byB2YWx1ZXMgb2Ygb25lIHNpZ24uXG4gICAgICBtaW4gPSBpZiBAc2lnbiA9PSAncG9zaXRpdmUnIHRoZW4gMCBlbHNlIEBpbWFnZS5taW5cbiAgICAgIG1heCA9IGlmIEBzaWduID09ICduZWdhdGl2ZScgdGhlbiAwIGVsc2UgQGltYWdlLm1heFxuICAgIEBjb2xvck1hcCA9IG5ldyBDb2xvck1hcChtaW4sIG1heCwgcGFsZXR0ZSwgc3RlcHMpXG5cblxuICBzZXRUaHJlc2hvbGQ6IChuZWdUaHJlc2ggPSAwLCBwb3NUaHJlc2ggPSAwKSAtPlxuICAgIEB0aHJlc2hvbGQgPSBuZXcgVGhyZXNob2xkKG5lZ1RocmVzaCwgcG9zVGhyZXNoLCBAc2lnbilcblxuXG4gICMgVXBkYXRlIHRoZSBsYXllcidzIHNldHRpbmdzIGZyb20gcHJvdmlkZWQgb2JqZWN0LlxuICB1cGRhdGU6IChzZXR0aW5ncykgLT5cbiAgICAjIEhhbmRsZSBzZXR0aW5ncyB0aGF0IHRha2UgcHJlY2VkZW5jZSBmaXJzdFxuICAgIEBzaWduID0gc2V0dGluZ3NbJ3NpZ24nXSBpZiAnc2lnbicgb2Ygc2V0dGluZ3NcblxuICAgICMgTm93IGV2ZXJ5dGhpbmcgZWxzZVxuICAgIG50ID0gMFxuICAgIHB0ID0gMFxuICAgIGZvciBrLCB2IG9mIHNldHRpbmdzXG4gICAgICBzd2l0Y2gga1xuICAgICAgICB3aGVuICdjb2xvclBhbGV0dGUnIHRoZW4gQHNldENvbG9yTWFwKHYpXG4gICAgICAgIHdoZW4gJ29wYWNpdHknIHRoZW4gQG9wYWNpdHkgPSB2XG4gICAgICAgIHdoZW4gJ2ltYWdlLWludGVudCcgdGhlbiBAaW50ZW50ID0gdlxuICAgICAgICB3aGVuICdwb3MtdGhyZXNob2xkJyB0aGVuIHB0ID0gdlxuICAgICAgICB3aGVuICduZWctdGhyZXNob2xkJyB0aGVuIG50ID0gdlxuICAgICAgICB3aGVuICdkZXNjcmlwdGlvbicgdGhlbiBAZGVzY3JpcHRpb24gPSB2XG4gICAgQHNldFRocmVzaG9sZChudCwgcHQsIEBzaWduKVxuXG5cbiAgIyBSZXR1cm4gY3VycmVudCBzZXR0aW5ncyBhcyBhbiBvYmplY3RcbiAgZ2V0U2V0dGluZ3M6ICgpIC0+XG4gICAgbnQgPSBAdGhyZXNob2xkLm5lZ1RocmVzaFxuICAgIHB0ID0gQHRocmVzaG9sZC5wb3NUaHJlc2hcbiAgICBudCBvcj0gMC4wXG4gICAgcHQgb3I9IDAuMFxuICAgIHNldHRpbmdzID1cbiAgICAgIGNvbG9yUGFsZXR0ZTogQHBhbGV0dGVcbiAgICAgIHNpZ246IEBzaWduXG4gICAgICBvcGFjaXR5OiBAb3BhY2l0eVxuICAgICAgJ2ltYWdlLWludGVudCc6IEBpbnRlbnRcbiAgICAgICdwb3MtdGhyZXNob2xkJzogcHRcbiAgICAgICduZWctdGhyZXNob2xkJzogbnRcbiAgICAgICdkZXNjcmlwdGlvbic6IEBkZXNjcmlwdGlvblxuICAgIHJldHVybiBzZXR0aW5nc1xuXG5cblxuIyBTdG9yZXMgYW5kIG1hbmFnZXMgYWxsIGN1cnJlbnRseSBsb2FkZWQgbGF5ZXJzLlxuY2xhc3MgTGF5ZXJMaXN0XG5cbiAgY29uc3RydWN0b3I6ICgpIC0+XG4gICAgQGNsZWFyTGF5ZXJzKClcblxuXG4gICMgQWRkIGEgbmV3IGxheWVyIGFuZCAob3B0aW9uYWxseSkgYWN0aXZhdGUgaXRcbiAgYWRkTGF5ZXI6IChsYXllciwgYWN0aXZhdGUgPSB0cnVlKSAtPlxuICAgIEBsYXllcnMucHVzaChsYXllcilcbiAgICBAYWN0aXZhdGVMYXllcihAbGF5ZXJzLmxlbmd0aC0xKSBpZiBhY3RpdmF0ZVxuXG5cbiAgIyBEZWxldGUgdGhlIGxheWVyIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXggYW5kIGFjdGl2YXRlXG4gICMgdGhlIG9uZSBhYm92ZSBvciBiZWxvdyBpdCBpZiBhcHByb3ByaWF0ZS4gSWYgdGFyZ2V0IGlzIFxuICAjIGFuIGludGVnZXIsIHRyZWF0IGFzIGluZGV4IG9mIGxheWVyIGluIGFycmF5OyBvdGhlcndpc2UgXG4gICMgdHJlYXQgYXMgdGhlIG5hbWUgb2YgdGhlIGxheWVyIHRvIHJlbW92ZS5cbiAgZGVsZXRlTGF5ZXI6ICh0YXJnZXQpIC0+XG4gICAgaW5kZXggPSBpZiBTdHJpbmcodGFyZ2V0KS5tYXRjaCgvXlxcZCskLykgdGhlbiBwYXJzZUludCh0YXJnZXQpXG4gICAgZWxzZVxuICAgICAgaW5kZXggPSAoaSBmb3IgbCwgaSBpbiBAbGF5ZXJzIHdoZW4gbC5uYW1lID09IHRhcmdldClbMF1cbiAgICBAbGF5ZXJzLnNwbGljZShpbmRleCwgMSlcbiAgICBpZiBAbGF5ZXJzLmxlbmd0aD8gYW5kIG5vdCBAYWN0aXZlTGF5ZXI/XG4gICAgICBuZXdJbmQgPSBpZiBpbmRleCA9PSAwIHRoZW4gMSBlbHNlIGluZGV4IC0gMVxuICAgICAgQGFjdGl2YXRlTGF5ZXIobmV3SW5kKVxuICAgICAgXG5cbiAgIyBEZWxldGUgYWxsIGxheWVyc1xuICBjbGVhckxheWVyczogKCkgLT5cbiAgICBAbGF5ZXJzID0gW11cbiAgICBAYWN0aXZlTGF5ZXIgPSBudWxsXG5cblxuICAjIEFjdGl2YXRlIHRoZSBsYXllciBhdCB0aGUgc3BlY2lmaWVkIGluZGV4XG4gIGFjdGl2YXRlTGF5ZXI6IChpbmRleCkgLT5cbiAgICBAYWN0aXZlTGF5ZXIgPSBAbGF5ZXJzW2luZGV4XVxuXG5cbiAgIyBVcGRhdGUgdGhlIGFjdGl2ZSBsYXllcidzIHNldHRpbmdzIGZyb20gcGFzc2VkIG9iamVjdFxuICB1cGRhdGVBY3RpdmVMYXllcjogKHNldHRpbmdzKSAtPlxuICAgIEBhY3RpdmVMYXllci51cGRhdGUoc2V0dGluZ3MpXG5cblxuICAjIFJldHVybiBqdXN0IHRoZSBuYW1lcyBvZiBsYXllcnNcbiAgZ2V0TGF5ZXJOYW1lczogKCkgLT5cbiAgICByZXR1cm4gKGwubmFtZSBmb3IgbCBpbiBAbGF5ZXJzKVxuXG5cbiAgIyBSZXR1cm4gYSBib29sZWFuIGFycmF5IG9mIGFsbCBsYXllcnMnIHZpc2liaWxpdGllc1xuICBnZXRMYXllclZpc2liaWxpdGllczogKCkgLT5cbiAgICByZXR1cm4gKGwudmlzaWJsZSBmb3IgbCBpbiBAbGF5ZXJzKVxuXG5cbiAgIyBSZXR1cm4gdGhlIGluZGV4IG9mIHRoZSBhY3RpdmUgbGF5ZXJcbiAgZ2V0QWN0aXZlSW5kZXg6ICgpIC0+XG4gICAgcmV0dXJuIEBsYXllcnMuaW5kZXhPZihAYWN0aXZlTGF5ZXIpXG5cblxuICAjIFJldHVybiB0aGUgbmV4dCB1bnVzZWQgY29sb3IgZnJvbSB0aGUgcGFsZXR0ZSBsaXN0LiBJZiBhbGwgXG4gICMgYXJlIGluIHVzZSwgcmV0dXJuIGEgcmFuZG9tIHBhbGV0dGUuXG4gIGdldE5leHRDb2xvcjogKCkgLT5cbiAgICB1c2VkID0gKGwucGFsZXR0ZSBmb3IgbCBpbiBAbGF5ZXJzIHdoZW4gbC52aXNpYmxlKVxuICAgIHBhbGV0dGVzID0gT2JqZWN0LmtleXMoQ29sb3JNYXAuUEFMRVRURVMpXG4gICAgZnJlZSA9IHBhbGV0dGVzLmRpZmYodXNlZClcbiAgICByZXR1cm4gaWYgZnJlZS5sZW5ndGggdGhlbiBmcmVlWzBdIGVsc2UgcGFsZXR0ZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKnBhbGV0dGVzLmxlbmd0aCldXG5cblxuICAjIFJlc29ydCB0aGUgbGF5ZXJzIHNvIHRoZXkgbWF0Y2ggdGhlIG9yZGVyIGluIHRoZSBpbnB1dFxuICAjIGFycmF5LiBMYXllcnMgaW4gdGhlIGlucHV0IGFyZSBzcGVjaWZpZWQgYnkgbmFtZS5cbiAgIyBJZiBkZXN0cm95IGlzIHRydWUsIHdpbGwgcmVtb3ZlIGFueSBsYXllcnMgbm90IHBhc3NlZCBpbi5cbiAgIyBPdGhlcndpc2Ugd2lsbCBwcmVzZXJ2ZSB0aGUgb3JkZXIgb2YgdW5zcGVjaWZpZWQgbGF5ZXJzLFxuICAjIFNsb3R0aW5nIHVuc3BlY2lmaWVkIGxheWVycyBhaGVhZCBvZiBzcGVjaWZpZWQgb25lc1xuICAjIHdoZW4gY29uZmxpY3RzIGFyaXNlLiBJZiBuZXdPblRvcCBpcyB0cnVlLCBuZXcgbGF5ZXJzXG4gICMgd2lsbCBhcHBlYXIgYWJvdmUgb2xkIG9uZXMuXG4gIHNvcnRMYXllcnM6IChuZXdPcmRlciwgZGVzdHJveSA9IGZhbHNlLCBuZXdPblRvcCA9IHRydWUpIC0+XG4gICAgbmV3TGF5ZXJzID0gW11cbiAgICBjb3VudGVyID0gMFxuICAgIG5fbGF5ZXJzID0gQGxheWVycy5sZW5ndGhcbiAgICBuX25ldyA9IG5ld09yZGVyLmxlbmd0aFxuICAgIGZvciBsLCBpIGluIEBsYXllcnNcbiAgICAgIG5pID0gbmV3T3JkZXIuaW5kZXhPZihsLm5hbWUpXG4gICAgICBpZiBuaSA8IDBcbiAgICAgICAgaWYgZGVzdHJveVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBuaSA9IGlcbiAgICAgICAgICBuaSArPSBuX25ldyBpZiBuZXdPblRvcFxuICAgICAgICAgIGNvdW50ZXIgKz0gMVxuICAgICAgZWxzZSB1bmxlc3MgKGRlc3Ryb3kgb3IgbmV3T25Ub3ApXG4gICAgICAgIG5pICs9IGNvdW50ZXJcbiAgICAgIG5ld0xheWVyc1tuaV0gPSBsXG4gICAgQGxheWVycyA9IG5ld0xheWVyc1xuXG5cblxuIyBQcm92aWRlcyB0aHJlc2hvbGRpbmcvbWFza2luZyBmdW5jdGlvbmFsaXR5LlxuY2xhc3MgVGhyZXNob2xkXG5cbiAgY29uc3RydWN0b3I6IChAbmVnVGhyZXNoLCBAcG9zVGhyZXNoLCBAc2lnbiA9ICdib3RoJykgLT5cblxuXG4gICMgTWFzayBvdXQgYW55IHZveGVsIHZhbHVlcyBiZWxvdy9hYm92ZSB0aHJlc2hvbGRzLlxuICBtYXNrOiAoZGF0YSkgLT5cbiAgICByZXR1cm4gZGF0YSBpZiBAcG9zVGhyZXNoIGlzIDAgYW5kIEBuZWdUaHJlc2ggaXMgMCBhbmQgQHNpZ24gPT0gJ2JvdGgnXG4gICAgIyBaZXJvIG91dCBhbnkgdmFsdWVzIGJlbG93IHRocmVzaG9sZCBvciB3aXRoIHdyb25nIHNpZ25cbiAgICByZXMgPSBbXVxuICAgIGZvciBpIGluIFswLi4uZGF0YS5sZW5ndGhdXG4gICAgICByZXNbaV0gPSBkYXRhW2ldLm1hcCAodikgPT5cbiAgICAgICAgaWYgKEBuZWdUaHJlc2ggPCB2IDwgQHBvc1RocmVzaCkgb3IgKHYgPCAwIGFuZCBAc2lnbiA9PSAncG9zaXRpdmUnKSBvciAodiA+IDAgYW5kIEBzaWduID09ICduZWdhdGl2ZScpIHRoZW4gMCBlbHNlIHZcbiAgICByZXR1cm4gcmVzXG5cblxuIyBWYXJpb3VzIHRyYW5zZm9ybWF0aW9ucyBiZXR3ZWVuIGRpZmZlcmVudCBjb29yZGluYXRlIGZyYW1lcy5cbiMgTm90ZSB0aGF0IHJpZ2h0IG5vdyB0aGUgYXRsYXMtcmVsYXRlZCB0cmFuc2Zvcm1hdGlvbnMgYXJlXG4jIGhhcmRjb2RlZCBmb3IgTU5JIDJ4MngyIHNwYWNlOyBuZWVkIHRvIGdlbmVyYWxpemUgdGhpcyFcblRyYW5zZm9ybSA9XG5cbiAgIyBUYWtlcyBjb21wcmVzc2VkIEpTT04tZW5jb2RlZCBpbWFnZSBkYXRhIGFzIGlucHV0IGFuZCByZWNvbnN0cnVjdHNcbiAgIyBpbnRvIGEgZGVuc2UgMUQgdmVjdG9yLCBpbmRleGVkIGZyb20gMCB0byB0aGUgdG90YWwgbnVtYmVyIG9mIHZveGVscy5cbiAganNvblRvVmVjdG9yOiAoZGF0YSkgLT5cbiAgICB2ID0gbmV3IEFycmF5KGRhdGEuZGltc1swXSAqIGRhdGEuZGltc1sxXSAqIGRhdGEuZGltc1syXSlcbiAgICB2W2ldID0gMCBmb3IgaSBpbiBbMC4uLnYubGVuZ3RoXVxuICAgIGZvciBpIGluIFswLi4uZGF0YS52YWx1ZXMubGVuZ3RoXVxuICAgICAgY3Vycl9pbmRzID0gZGF0YS5pbmRpY2VzW2ldXG4gICAgICBmb3IgaiBpbiBbMC4uLmN1cnJfaW5kcy5sZW5ndGhdXG4gICAgICAgICAgdltjdXJyX2luZHNbal0gLSAxXSA9IGRhdGEudmFsdWVzW2ldXG4gICAgcmV0dXJuKHYpXG5cbiAgIyBSZXNoYXBlIGEgMUQgdmVjdG9yIG9mIGFsbCB2b3hlbHMgaW50byBhIDNEIHZvbHVtZSB3aXRoIHNwZWNpZmllZCBkaW1zLlxuICB2ZWN0b3JUb1ZvbHVtZTogKHZlYywgZGltcykgLT5cbiAgICB2b2wgPSBbXVxuICAgIGZvciBpIGluIFswLi4uZGltc1swXV1cbiAgICAgIHZvbFtpXSA9IFtdXG4gICAgICBmb3IgaiBpbiBbMC4uLmRpbXNbMV1dXG4gICAgICAgIHZvbFtpXVtqXSA9IFtdXG4gICAgICAgIGZvciBrIGluIFswLi4uZGltc1syXV1cbiAgICAgICAgICB2b2xbaV1bal1ba10gPSAwXG4gICAgICAgICAgc2xpY2VTaXplID0gZGltc1sxXSAqIGRpbXNbMl1cbiAgICBmb3IgaSBpbiBbMC4uLnZlYy5sZW5ndGhdXG4gICAgICBjb250aW51ZSBpZiB0eXBlb2YgdmVjW2ldIGlzIGB1bmRlZmluZWRgXG4gICAgICB4ID0gTWF0aC5mbG9vcihpIC8gc2xpY2VTaXplKVxuICAgICAgeSA9IE1hdGguZmxvb3IoKGkgLSAoeCAqIHNsaWNlU2l6ZSkpIC8gZGltc1syXSlcbiAgICAgIHogPSBpIC0gKHggKiBzbGljZVNpemUpIC0gKHkgKiBkaW1zWzJdKVxuICAgICAgdm9sW3hdW3ldW3pdID0gdmVjW2ldXG4gICAgcmV0dXJuKHZvbClcblxuICAjIENyZWF0ZSB0cmFuc2Zvcm1hdGlvbiBtYXRyaXggZnJvbSB0cmFuc2xhdGlvbiBhbmQgc2NhbGluZyBwYXJhbWV0ZXJzXG4gIF90cmFuc2Zvcm1hdGlvbk1hdHJpeDogKHRyYW5zbGF0ZVhZWiwgc2NhbGVYWVopIC0+XG4gICAgTSA9IFtdXG4gICAgIyBjcmVhdGUgcm93LWJ5LXJvd1xuICAgIGZvciBpaSBpbiBbMC4uMl1cbiAgICAgICAgcm93ID0gKDAgZm9yIGpqIGluIFswLi4zXSkgIyB6ZXJvIGFycmF5IG9mIGxlbmd0aCA0XG4gICAgICAgIHJvd1tpaV0gPSB0cmFuc2xhdGVYWVpbaWldXG4gICAgICAgIHJvd1szXSA9IHNjYWxlWFlaW2lpXVxuICAgICAgICBNLnB1c2gocm93KVxuICAgIGNvbnNvbGUubG9nIE1cbiAgICByZXR1cm4gTVxuICBcbiAgIyBHZW5lcmljIGNvb3JkaW5hdGUgdHJhbnNmb3JtYXRpb24gZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBpbnB1dFxuICAjIHNldCBvZiBjb29yZGluYXRlcyBhbmQgYSBtYXRyaXggdG8gdXNlIGluIHRoZSB0cmFuc2Zvcm1hdGlvbi5cbiAgIyBEZXBlbmRzIG9uIHRoZSBTeWx2ZXN0ZXIgbGlicmFyeS5cbiAgdHJhbnNmb3JtQ29vcmRpbmF0ZXM6IChjb29yZHMsIG1hdHJpeCwgcm91bmQgPSB0cnVlKSAtPlxuICAgIG0gPSAkTShtYXRyaXgpXG4gICAgY29vcmRzID0gY29vcmRzLnNsaWNlKDApICAjIERvbid0IG1vZGlmeSBpbi1wbGFjZVxuICAgIGNvb3Jkcy5wdXNoKDEpXG4gICAgdiA9ICRWKGNvb3JkcylcbiAgICByZXMgPSBbXVxuICAgIG0ueCh2KS5lYWNoIChlKSAtPlxuICAgICAgZSA9IE1hdGgucm91bmQoZSkgaWYgcm91bmRcbiAgICAgIHJlcy5wdXNoKGUpXG4gICAgcmV0dXJuIHJlc1xuXG5cbiAgIyBUcmFuc2Zvcm1hdGlvbiBtYXRyaXggZm9yIHZpZXdlciBzcGFjZSAtLT4gYXRsYXMgKE1OSSAybW0pIHNwYWNlXG4gIHZpZXdlclRvQXRsYXM6IChjb29yZHMpIC0+XG4gICAgbWF0cml4ID0gQF90cmFuc2Zvcm1hdGlvbk1hdHJpeChbMTgwLCAtMjE4LCAtMTgwXSwgWy05MCwgOTAsIDEwOF0pXG4gICAgcmV0dXJuIEB0cmFuc2Zvcm1Db29yZGluYXRlcyhjb29yZHMsIG1hdHJpeClcblxuICBhdGxhc1RvVmlld2VyOiAoY29vcmRzKSAtPlxuICAgIG1hdHJpeCA9IEBfdHJhbnNmb3JtYXRpb25NYXRyaXgoWzEuMC8xODAsIC0xLjAvMjE4LCA5MC4wLzIxOF0sIFswLjUsIDkwLjAvMjE4LCAxMDguMC8xODBdKVxuICAgIHJldHVybiBAdHJhbnNmb3JtQ29vcmRpbmF0ZXMoY29vcmRzLCBtYXRyaXgsIGZhbHNlKVxuXG4gICMgVHJhbnNmb3JtYXRpb24gbWF0cml4IGZvciBhdGxhcyAoTU5JIDJtbSkgc3BhY2UgLS0+IGltYWdlICgwLWluZGV4ZWQpIHNwYWNlXG4gIGF0bGFzVG9JbWFnZTogKGNvb3JkcykgLT5cbiAgICBtYXRyaXggPSBAX3RyYW5zZm9ybWF0aW9uTWF0cml4KFstLjUsIC41LCAuNV0sIFs0NSwgNjMsIDM2XSlcbiAgICByZXR1cm4gQHRyYW5zZm9ybUNvb3JkaW5hdGVzKGNvb3JkcywgbWF0cml4KVxuXG4gICMgVHJhbnNmb3JtYXRpb24gbWF0cml4IGZvciBpbWFnZSBzcGFjZSAtLT4gYXRsYXMgKE1OSSAybW0pIHNwYWNlXG4gIGltYWdlVG9BdGxhczogKGNvb3JkcykgLT5cbiAgICBtYXRyaXggPSBAX3RyYW5zZm9ybWF0aW9uTWF0cml4KFstMiwgMiwgMl0sIFs5MCwgLTEyNiwgLTcyXSlcbiAgICByZXR1cm4gQHRyYW5zZm9ybUNvb3JkaW5hdGVzKGNvb3JkcywgbWF0cml4KVxuIiwiY2xhc3MgVXNlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQHZpZXdlciwgQGxheWVyTGlzdElkLCBAbGF5ZXJTZXR0aW5nQ2xhc3MpIC0+XG5cbiAgICBAdmlld1NldHRpbmdzID0gQHZpZXdlci52aWV3U2V0dGluZ3NcbiAgICBAY29tcG9uZW50cyA9IHt9XG5cbiAgICAjIE1ha2UgbGF5ZXIgbGlzdCBzb3J0YWJsZSwgYW5kIHVwZGF0ZSB0aGUgbW9kZWwgYWZ0ZXIgc29ydGluZy5cbiAgICAkKEBsYXllckxpc3RJZCkuc29ydGFibGUoe1xuICAgICAgdXBkYXRlOiA9PiAgXG4gICAgICAgIGxheWVycyA9ICgkKCcubGF5ZXJfbGlzdF9pdGVtJykubWFwIC0+XG4gICAgICAgICAgcmV0dXJuICQodGhpcykudGV4dCgpXG4gICAgICAgICkudG9BcnJheSgpXG4gICAgICAgIEB2aWV3ZXIuc29ydExheWVycyhsYXllcnMsIHBhaW50ID0gdHJ1ZSlcbiAgICB9KVxuXG4gICAgIyBBZGQgZXZlbnQgaGFuZGxlcnNcbiAgICAkKEBsYXllclNldHRpbmdDbGFzcykuY2hhbmdlKChlKSA9PlxuICAgICAgQHNldHRpbmdzQ2hhbmdlZCgpXG4gICAgKVxuXG4gICMgQWRkIGEgc2xpZGVyIHRvIHRoZSB2aWV3XG4gIGFkZFNsaWRlcjogKG5hbWUsIGVsZW1lbnQsIG9yaWVudGF0aW9uLCBtaW4sIG1heCwgdmFsdWUsIHN0ZXAsIHRleHRGaWVsZCkgLT5cbiAgICBzbGlkZXIgPSBuZXcgU2xpZGVyQ29tcG9uZW50KEAsIG5hbWUsIGVsZW1lbnQsIG9yaWVudGF0aW9uLCBtaW4sIG1heCwgdmFsdWUsIHN0ZXApXG4gICAgQGFkZFRleHRGaWVsZEZvclNsaWRlcih0ZXh0RmllbGQsIHNsaWRlcikgaWYgdGV4dEZpZWxkP1xuICAgIEBjb21wb25lbnRzW25hbWVdID0gc2xpZGVyXG5cbiAgIyBBZGQgYSB0ZXh0IGZpZWxkLS1laXRoZXIgYW4gZWRpdGFibGUgPGlucHV0PiBmaWVsZCwgb3IganVzdCBhIHJlZ3VsYXIgZWxlbWVudFxuICBhZGRUZXh0RmllbGQ6IChuYW1lLCBlbGVtZW50KSAtPlxuICAgIHRmID0gbmV3IFRleHRGaWVsZENvbXBvbmVudChALCBuYW1lLCBlbGVtZW50KVxuICAgIEBjb21wb25lbnRzW25hbWVdID0gdGZcblxuICAjIENyZWF0ZSBhIHRleHQgZmllbGQgYW5kIGJpbmQgaXQgdG8gYSBzbGlkZXIgc28gdGhlIHVzZXIgY2FuIHVwZGF0ZS92aWV3IHZhbHVlcyBkaXJlY3RseVxuICBhZGRUZXh0RmllbGRGb3JTbGlkZXI6IChlbGVtZW50LCBzbGlkZXIpIC0+XG4gICAgbmFtZSA9IHNsaWRlci5uYW1lICsgJ190ZXh0RmllbGQnXG4gICAgdGYgPSBuZXcgVGV4dEZpZWxkQ29tcG9uZW50KEAsIG5hbWUsIGVsZW1lbnQsIHNsaWRlcilcbiAgICBzbGlkZXIuYXR0YWNoVGV4dEZpZWxkKHRmKVxuXG5cbiAgYWRkQ29sb3JTZWxlY3Q6IChlbGVtZW50KSAtPlxuICAgIEBjb21wb25lbnRzWydjb2xvclBhbGV0dGUnXSA9IG5ldyBTZWxlY3RDb21wb25lbnQoQCwgJ2NvbG9yUGFsZXR0ZScsIGVsZW1lbnQsIE9iamVjdC5rZXlzKENvbG9yTWFwLlBBTEVUVEVTKSlcblxuXG4gIGFkZFNpZ25TZWxlY3Q6IChlbGVtZW50KSAtPlxuICAgIEBjb21wb25lbnRzWydzaWduJ10gPSBuZXcgU2VsZWN0Q29tcG9uZW50KEAsICdzaWduU2VsZWN0JywgZWxlbWVudCwgWydib3RoJywgJ3Bvc2l0aXZlJywgJ25lZ2F0aXZlJ10pXG5cblxuICAjIEFkZCBjaGVja2JveGVzIGZvciBvcHRpb25zIHRvIHRoZSB2aWV3LiBOb3QgdGhyaWxsZWQgYWJvdXQgbWl4aW5nIHZpZXcgYW5kIG1vZGVsIGluXG4gICMgdGhpcyB3YXksIGJ1dCB0aGUgR1VJIGNvZGUgbmVlZHMgcmVmYWN0b3JpbmcgYW55d2F5LCBhbmQgZm9yIG5vdyB0aGlzIG1ha2VzIHVwZGF0aW5nXG4gICMgbXVjaCBlYXNpZXIuXG4gIGFkZFNldHRpbmdzQ2hlY2tib3hlczogKGVsZW1lbnQsIHNldHRpbmdzKSAtPlxuICAgICQoZWxlbWVudCkuZW1wdHkoKVxuICAgIHZhbGlkU2V0dGluZ3MgPSB7XG4gICAgICBwYW56b29tOiAnUGFuL3pvb20nXG4gICAgICBjcm9zc2hhaXJzOiAnQ3Jvc3NoYWlycydcbiAgICAgIGxhYmVsczogJ0xhYmVscydcbiAgICB9XG4gICAgZm9yIHMsdiBvZiBzZXR0aW5nc1xuICAgICAgaWYgcyBvZiB2YWxpZFNldHRpbmdzXG4gICAgICAgIGNoZWNrZWQgPSBpZiB2IHRoZW4gJyBjaGVja2VkJyBlbHNlICcnXG4gICAgICAgICQoZWxlbWVudCkuYXBwZW5kKFwiPGRpdiBjbGFzcz0nY2hlY2tib3hfcm93Jz48aW5wdXQgdHlwZT0nY2hlY2tib3gnIGNsYXNzPSdzZXR0aW5nc19ib3gnICN7Y2hlY2tlZH0gaWQ9JyN7c30nPiN7dmFsaWRTZXR0aW5nc1tzXX08L2Rpdj5cIilcbiAgICAkKCcuc2V0dGluZ3NfYm94JykuY2hhbmdlKChlKSA9PlxuICAgICAgQGNoZWNrYm94ZXNDaGFuZ2VkKClcbiAgICApXG5cbiAgIyBDYWxsIHdoZW4gc2V0dGluZ3MgY2hhbmdlIGluIHRoZSB2aWV3IC4gRXh0cmFjdHMgYWxsIGF2YWlsYWJsZSBzZXR0aW5ncyBhcyBhIGhhc2ggXG4gICMgYW5kIGNhbGxzIHRoZSBjb250cm9sbGVyIHRvIHVwZGF0ZSB0aGUgbGF5ZXIgbW9kZWwuIE5vdGUgdGhhdCBubyB2YWxpZGF0aW9uIG9yIFxuICAjIHNjYWxpbmcgb2YgcGFyYW1ldGVycyBpcyBkb25lIGhlcmUtLXRoZSB2aWV3IHJldHVybnMgYWxsIHNsaWRlciB2YWx1ZXMgYXMgdGhleSBcbiAgIyBleGlzdCBpbiB0aGUgRE9NIGFuZCB0aGVzZSBtYXkgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZCBsYXRlci5cbiAgc2V0dGluZ3NDaGFuZ2VkOiAoKSAtPlxuICAgIHNldHRpbmdzID0ge31cbiAgICBmb3IgbmFtZSwgY29tcG9uZW50IG9mIEBjb21wb25lbnRzXG4gICAgICBzZXR0aW5nc1tuYW1lXSA9IGNvbXBvbmVudC5nZXRWYWx1ZSgpXG4gICAgQHZpZXdlci51cGRhdGVTZXR0aW5ncyhzZXR0aW5ncylcblxuICAjIEV2ZW50IGhhbmRsZXIgZm9yIGNoZWNrYm94ZXNcbiAgY2hlY2tib3hlc0NoYW5nZWQ6ICgpIC0+XG4gICAgc2V0dGluZ3MgPSB7fVxuICAgIGZvciBzIGluICQoJy5zZXR0aW5nc19ib3gnKVxuICAgICAgaWQgPSAkKHMpLmF0dHIoJ2lkJylcbiAgICAgIHZhbCA9IGlmICQocykuaXMoJzpjaGVja2VkJykgdGhlbiB0cnVlIGVsc2UgZmFsc2VcbiAgICAgIHNldHRpbmdzW2lkICsgJ0VuYWJsZWQnXSA9IHZhbFxuICAgIEB2aWV3ZXIudXBkYXRlVmlld1NldHRpbmdzKHNldHRpbmdzLCB0cnVlKVxuXG4gICMgU3luYyBhbGwgY29tcG9uZW50cyAoaS5lLiwgVUkgZWxlbWVudHMpIHdpdGggbW9kZWwuXG4gIHVwZGF0ZUNvbXBvbmVudHM6IChzZXR0aW5ncykgLT5cbiAgICBmb3IgbmFtZSwgdmFsdWUgb2Ygc2V0dGluZ3NcbiAgICAgIGlmIG5hbWUgb2YgQGNvbXBvbmVudHNcbiAgICAgICAgQGNvbXBvbmVudHNbbmFtZV0uc2V0VmFsdWUodmFsdWUpXG5cbiAgIyBVcGRhdGUgdGhlIHRocmVzaG9sZCBzbGlkZXJzIHVzaW5nIGltYWdlIGRhdGEuIEtpbmQgb2YgYSBjcnVtbXkgd2F5IHRvIGhhbmRsZSB0aGlzLS1cbiAgIyByZWFsbHkgd2Ugc2hvdWxkIHVzZSBiYWNrYm9uZS5qcyBvciBzb21lIG90aGVyIGZyYW1ld29yayB0byBiaW5kIGRhdGEgdG8gbW9kZWxzIHByb3Blcmx5LlxuICB1cGRhdGVUaHJlc2hvbGRTbGlkZXJzOiAoaW1hZ2UpIC0+XG4gICAgaWYgJ3Bvcy10aHJlc2hvbGQnIG9mIEBjb21wb25lbnRzXG4gICAgICBAY29tcG9uZW50c1sncG9zLXRocmVzaG9sZCddLnNldFJhbmdlKDAsIGltYWdlLm1heClcbiAgICBpZiAnbmVnLXRocmVzaG9sZCcgb2YgQGNvbXBvbmVudHNcbiAgICAgIEBjb21wb25lbnRzWyduZWctdGhyZXNob2xkJ10uc2V0UmFuZ2UoaW1hZ2UubWluLCAwKVxuXG4gICMgVXBkYXRlIHRoZSBsaXN0IG9mIGxheWVycyBpbiB0aGUgdmlldyBmcm9tIGFuIGFycmF5IG9mIG5hbWVzIGFuZCBzZWxlY3RzXG4gICMgdGhlIHNlbGVjdGVkIGxheWVyIGJ5IGluZGV4LlxuICB1cGRhdGVMYXllckxpc3Q6IChsYXllcnMsIHNlbGVjdGVkSW5kZXgpIC0+XG4gICAgJChAbGF5ZXJMaXN0SWQpLmVtcHR5KClcbiAgICBmb3IgaSBpbiBbMC4uLmxheWVycy5sZW5ndGhdXG4gICAgICBsID0gbGF5ZXJzW2ldXG4gICAgICBcbiAgICAgIHZpc2liaWxpdHlfaWNvbiA9IGlmIEB2aWV3U2V0dGluZ3MudmlzaWJpbGl0eUljb25FbmFibGVkXG4gICAgICAgIFwiPGRpdiBjbGFzcz0ndmlzaWJpbGl0eV9pY29uJyB0aXRsZT0nSGlkZS9zaG93IGltYWdlJz48c3BhbiBjbGFzcz0nZ2x5cGhpY29uIGdseXBoaWNvbi1leWUtb3Blbic+PC9pPjwvZGl2PlwiXG4gICAgICBlbHNlICcnXG5cbiAgICAgIGRlbGV0aW9uX2ljb24gPSBpZiBAdmlld1NldHRpbmdzLmRlbGV0aW9uSWNvbkVuYWJsZWRcbiAgICAgICAgXCI8ZGl2IGNsYXNzPSdkZWxldGlvbl9pY29uJyB0aXRsZT0nUmVtb3ZlIHRoaXMgbGF5ZXInPjxzcGFuIGNsYXNzPSdnbHlwaGljb24gZ2x5cGhpY29uLXRyYXNoJz48L2k+PC9kaXY+XCJcbiAgICAgIGVsc2UgJydcblxuICAgICAgZG93bmxvYWRfaWNvbiA9IGlmIHRydWVcbiAgICAgICAgXCI8ZGl2IGNsYXNzPSdkb3dubG9hZF9pY29uJyB0aXRsZT0nRG93bmxvYWQgdGhpcyBpbWFnZSc+PHNwYW4gY2xhc3M9J2dseXBoaWNvbiBnbHlwaGljb24tc2F2ZSc+PC9pPjwvZGl2PlwiXG4gICAgICBlbHNlICcnXG5cblxuICAgICAgJChAbGF5ZXJMaXN0SWQpLmFwcGVuZChcbiAgICAgICAgJChcIjxsaSBjbGFzcz0nbGF5ZXJfbGlzdF9pdGVtJz4je3Zpc2liaWxpdHlfaWNvbn08ZGl2IGNsYXNzPSdsYXllcl9sYWJlbCc+XCIgKyBsICsgXG4gICAgICAgICAgXCI8L2Rpdj4je2Rvd25sb2FkX2ljb259I3tkZWxldGlvbl9pY29ufTwvbGk+XCIpXG4gICAgICApXG4gICAgIyBBZGQgY2xpY2sgZXZlbnQgaGFuZGxlciB0byBhbGwgbGlzdCBpdGVtcyBhbmQgdmlzaWJpbGl0eSBpY29uc1xuICAgICQoJy5sYXllcl9sYWJlbCcpLmNsaWNrKChlKSA9PlxuICAgICAgQHZpZXdlci5zZWxlY3RMYXllcigkKCcubGF5ZXJfbGFiZWwnKS5pbmRleChlLnRhcmdldCkpXG4gICAgKVxuXG4gICAgIyBTZXQgZXZlbnQgaGFuZGxlcnMgZm9yIGljb24gY2xpY2tzLS12aXNpYmlsaXR5LCBkb3dubG9hZCwgZGVsZXRpb25cbiAgICAkKCcudmlzaWJpbGl0eV9pY29uJykuY2xpY2soKGUpID0+XG4gICAgICBAdG9nZ2xlTGF5ZXIoJCgnLnZpc2liaWxpdHlfaWNvbicpLmluZGV4KCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2RpdicpKSlcbiAgICApXG4gICAgJCgnLmRlbGV0aW9uX2ljb24nKS5jbGljaygoZSkgPT5cbiAgICAgIGlmIGNvbmZpcm0oXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gcmVtb3ZlIHRoaXMgbGF5ZXI/XCIpXG4gICAgICAgIEB2aWV3ZXIuZGVsZXRlTGF5ZXIoJCgnLmRlbGV0aW9uX2ljb24nKS5pbmRleCgkKGUudGFyZ2V0KS5jbG9zZXN0KCdkaXYnKSkpXG4gICAgKVxuICAgICQoJy5kb3dubG9hZF9pY29uJykuY2xpY2soKGUpID0+XG4gICAgICBAdmlld2VyLmRvd25sb2FkSW1hZ2UoJCgnLmRvd25sb2FkX2ljb24nKS5pbmRleCgkKGUudGFyZ2V0KS5jbG9zZXN0KCdkaXYnKSkpXG4gICAgKVxuXG4gICAgJChAbGF5ZXJMaXN0SWQpLnZhbChzZWxlY3RlZEluZGV4KVxuXG4gICMgVXBkYXRlIHRoZSBleWUgY2xvc2VkL29wZW4gaWNvbnMgaW4gdGhlIGxpc3QgYmFzZWQgb24gdGhlaXIgY3VycmVudCB2aXNpYmlsaXR5XG4gIHVwZGF0ZUxheWVyVmlzaWJpbGl0eTogKHZpc2libGUpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAdmlld1NldHRpbmdzLnZpc2liaWxpdHlJY29uRW5hYmxlZFxuICAgIGZvciBpIGluIFswLi4udmlzaWJsZS5sZW5ndGhdXG4gICAgICBpZiB2aXNpYmxlW2ldXG4gICAgICAgICQoJy52aXNpYmlsaXR5X2ljb24+c3BhbicpLmVxKGkpLnJlbW92ZUNsYXNzKCdnbHlwaGljb24gZ2x5cGhpY29uLWV5ZS1jbG9zZScpLmFkZENsYXNzKCdnbHlwaGljb24gZ2x5cGhpY29uLWV5ZS1vcGVuJylcbiAgICAgIGVsc2VcbiAgICAgICAgJCgnLnZpc2liaWxpdHlfaWNvbj5zcGFuJykuZXEoaSkucmVtb3ZlQ2xhc3MoJ2dseXBoaWNvbiBnbHlwaGljb24tZXllLW9wZW4nKS5hZGRDbGFzcygnZ2x5cGhpY29uIGdseXBoaWNvbi1leWUtY2xvc2UnKVxuXG4gICMgU3luYyB0aGUgc2VsZWN0ZWQgbGF5ZXIgd2l0aCB0aGUgdmlld1xuICB1cGRhdGVMYXllclNlbGVjdGlvbjogKGlkKSAtPlxuICAgICQoJy5sYXllcl9sYWJlbCcpLmVxKGlkKS5hZGRDbGFzcygnc2VsZWN0ZWQnKVxuICAgICQoJy5sYXllcl9sYWJlbCcpLm5vdChcIjplcSgje2lkfSlcIikucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAjIFRvZ2dsZSB0aGUgc3BlY2lmaWVkIGxheWVyJ3MgdmlzaWJpbGl0eVxuICB0b2dnbGVMYXllcjogKGlkKSAtPlxuICAgIEB2aWV3ZXIudG9nZ2xlTGF5ZXIoaWQpXG5cblxuXG4jIFByZXNlbnRzIGRhdGEgdG8gdXNlci4gU2hvdWxkIG9ubHkgaW5jbHVkZSBub24taW50ZXJhY3RpdmUgZmllbGRzLlxuY2xhc3MgRGF0YVBhbmVsXG5cbiAgY29uc3RydWN0b3I6IChAdmlld2VyKSAtPlxuICAgIEBmaWVsZHMgPSB7fVxuXG5cbiAgYWRkRGF0YUZpZWxkOiAobmFtZSwgZWxlbWVudCkgLT5cbiAgICBAZmllbGRzW25hbWVdID0gbmV3IERhdGFGaWVsZChALCBuYW1lLCBlbGVtZW50KVxuXG5cbiAgYWRkQ29vcmRpbmF0ZUZpZWxkczogKG5hbWUsIGVsZW1lbnQpIC0+XG4gICAgdGFyZ2V0ID0gJChlbGVtZW50KVxuICAgICMgSW5zZXJ0IGVsZW1lbnRzIGZvciB4L3kveiB1cGRhdGUgZmllbGRzXG4gICAgZm9yIGkgaW4gWzAuLi4yXVxuICAgICAgdGFyZ2V0LmFwcGVuZCgkKFwiPGRpdiBjbGFzcz0nYXhpc19wb3MnIGlkPSdheGlzX3Bvc18je2F4aXN9Jz48L2Rpdj5cIikpXG4gICAgIyBBZGQgY2hhbmdlIGhhbmRsZXItLXdoZW4gYW55IGF4aXMgY2hhbmdlcywgdXBkYXRlIGFsbCBjb29yZGluYXRlc1xuICAgICQoJ2F4aXNfcG9zJykuY2hhbmdlKChlKSA9PlxuICAgICAgZm9yIGkgaW4gWzAuLi4yXVxuICAgICAgICBjYyA9ICQoXCIjYXhpc19wb3NfI3tpfVwiKS52YWwoKSAgIyBHZXQgY3VycmVudCBwb3NpdGlvblxuICAgICAgICAjIFRPRE86IEFERCBWQUxJREFUSU9OLS1ORUVEIFRPIFJPVU5EIFRPIE5FQVJFU1QgVkFMSUQgUE9TSVRJT05cbiAgICAgICAgIyAgICAgQU5EIE1BS0UgU1VSRSBXRSdSRSBXSVRISU4gQk9VTkRTXG4gICAgICAgIEB2aWV3ZXIuY29vcmRzX2FiY1tpXSA9IFRyYW5zZm9ybS5hdGxhc1RvVmlld2VyKGNjKVxuICAgICAgICBAdmlld2VyLmNvb3Jkc19pamtbaV0gPSBjY1xuICAgICAgQHZpZXdlci51cGRhdGUoKSAgIyBGaXhcbiAgICApXG5cblxuICB1cGRhdGU6IChkYXRhKSAtPlxuICAgIGZvciBrLCB2IG9mIGRhdGFcbiAgICAgIGlmIGsgb2YgQGZpZWxkc1xuICAgICAgICAjIEZvciBtdWx0aS1maWVsZCBjb29yZGluYXRlIHJlcHJlc2VudGF0aW9uLCBhc3NpZ24gZWFjaCBwbGFuZVxuICAgICAgICBpZiBrID09ICdjdXJyZW50Q29vcmRzTXVsdGknXG4gICAgICAgICAgZm9yIHBvcywgaSBvZiB2XG4gICAgICAgICAgICAkKFwicGxhbmUje2l9X3Bvc1wiKS50ZXh0KHBvcylcbiAgICAgICAgIyBPdGhlcndpc2UganVzdCBzZXQgdmFsdWUsIGhhbmRsaW5nIHNwZWNpYWwgY2FzZXMgYXBwcm9wcmlhdGVseVxuICAgICAgICBlbHNlXG4gICAgICAgICAgaWYgayA9PSAnY3VycmVudENvb3JkcydcbiAgICAgICAgICAgIHYgPSBcIlsje3Z9XVwiXG4gICAgICAgICAgJChAZmllbGRzW2tdLmVsZW1lbnQpLnRleHQodilcblxuXG5cbmNsYXNzIFZpZXdTZXR0aW5nc1xuXG4gICMjIyBTdG9yZXMgYW55IHNldHRpbmdzIGNvbW1vbiB0byBhbGwgdmlld3MtLWUuZy4sIGNyb3NzaGFpciBwcmVmZXJlbmNlcyxcbiAgZHJhZ2dpbmcvem9vbWluZywgZXRjLiBJbmRpdmlkdWFsIHZpZXdzIGNhbiBvdmVycmlkZSB0aGVzZSBzZXR0aW5ncyBpZiB2aWV3LXNwZWNpZmljXG4gIG9wdGlvbnMgYXJlIGRlc2lyZWQuICMjI1xuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICAjIERlZmF1bHRzXG4gICAgQHNldHRpbmdzID0ge1xuICAgICAgcGFuem9vbUVuYWJsZWQ6IGZhbHNlXG4gICAgICBjcm9zc2hhaXJzRW5hYmxlZDogdHJ1ZVxuICAgICAgY3Jvc3NoYWlyc1dpZHRoOiAxXG4gICAgICBjcm9zc2hhaXJzQ29sb3I6ICdsaW1lJ1xuICAgICAgbGFiZWxzRW5hYmxlZDogdHJ1ZVxuICAgICAgdmlzaWJpbGl0eUljb25FbmFibGVkOiB0cnVlXG4gICAgICBkZWxldGlvbkljb25FbmFibGVkOiB0cnVlXG4gICAgfVxuICAgIEB1cGRhdGVTZXR0aW5ncyhvcHRpb25zKVxuXG5cbiAgdXBkYXRlU2V0dGluZ3M6IChvcHRpb25zKSAtPlxuICAgICQuZXh0ZW5kKEBzZXR0aW5ncywgb3B0aW9ucylcbiAgICBmb3IgaywgdiBvZiBAc2V0dGluZ3NcbiAgICAgIEBba10gPSB2XG4gICAgQGNyb3NzaGFpcnMgPSBuZXcgQ3Jvc3NoYWlycyhAY3Jvc3NoYWlyc0VuYWJsZWQsIEBjcm9zc2hhaXJzQ29sb3IsIEBjcm9zc2hhaXJzV2lkdGgpXG5cblxuXG5jbGFzcyBWaWV3XG5cbiAgY29uc3RydWN0b3I6IChAdmlld2VyLCBAdmlld1NldHRpbmdzLCBAZWxlbWVudCwgQGRpbSwgQGxhYmVscyA9IHRydWUsIEBzbGlkZXIgPSBudWxsKSAtPlxuICAgIEByZXNldENhbnZhcygpXG4gICAgQF9qUXVlcnlJbml0KClcblxuXG4gICMgQWRkIGEgbmF2IHNsaWRlclxuICBhZGRTbGlkZXI6IChuYW1lLCBlbGVtZW50LCBvcmllbnRhdGlvbiwgbWluLCBtYXgsIHZhbHVlLCBzdGVwLCB0ZXh0RmllbGQpIC0+XG4gICAgQHNsaWRlciA9IG5ldyBTbGlkZXJDb21wb25lbnQoQCwgbmFtZSwgZWxlbWVudCwgb3JpZW50YXRpb24sIG1pbiwgbWF4LCB2YWx1ZSwgc3RlcClcbiAgICBAdmlld2VyLmFkZFRleHRGaWVsZEZvclNsaWRlcih0ZXh0RmllbGQsIEBzbGlkZXIpIGlmIHRleHRGaWVsZD9cblxuXG4gIGNsZWFyOiAtPlxuICAgICMgVGVtcG9yYXJpbHkgcmVzZXQgdGhlIGNvbnRleHQgc3RhdGUsIGJsYW5rIHRoZSB2aWV3LCB0aGVuIHJlc3RvcmUgc3RhdGVcbiAgICBjdXJyZW50U3RhdGUgPSAkLmV4dGVuZCh0cnVlLCB7fSwgQGNvbnRleHQuZ2V0VHJhbnNmb3JtKCkpICAjIERlZXAgY29weVxuICAgIEBjb250ZXh0LnJlc2V0KClcbiAgICBAY29udGV4dC5maWxsU3R5bGUgPSAnYmxhY2snXG4gICAgQGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgQHdpZHRoLCBAaGVpZ2h0KVxuICAgIEBjb250ZXh0LnNldFRyYW5zZm9ybUZyb21BcnJheShjdXJyZW50U3RhdGUpXG5cblxuICByZXNldENhbnZhczogLT5cbiAgICAjIFJlc2V0cyBhbGwgY2FudmFzIHByb3BlcnRpZXMgYW5kIHRyYW5zZm9ybWF0aW9ucy4gVHlwaWNhbGx5IHRoaXMgd2lsbCBvbmx5IG5lZWQgXG4gICAgIyB0byBiZSBjYWxsZWQgZHVyaW5nIGNvbnN0cnVjdGlvbiwgYnV0IHNvbWUgc2l0dWF0aW9ucyBtYXkgcmVxdWlyZSByZXNldGluZyBcbiAgICAjIGR1cmluZyBydW50aW1lLS1lLmcuLCB3aGVuIHJldmVhbGluZyBhIGhpZGRlbiBjYW52YXMgKHdoaWNoIGNhbid0IGJlIGRyYXduIHRvXG4gICAgIyAgd2hpbGUgaGlkZGVuKS5cbiAgICBAY2FudmFzID0gJChAZWxlbWVudCkuZmluZCgnY2FudmFzJylcbiAgICBAd2lkdGggPSBAY2FudmFzLndpZHRoKClcbiAgICBAaGVpZ2h0ID0gQGNhbnZhcy5oZWlnaHQoKVxuICAgIEBjb250ZXh0ID0gQGNhbnZhc1swXS5nZXRDb250ZXh0KFwiMmRcIikgICAgIFxuICAgIHRyYWNrVHJhbnNmb3JtcyhAY29udGV4dClcbiAgICBAbGFzdFggPSBAd2lkdGggLyAyXG4gICAgQGxhc3RZID0gQGhlaWdodCAvIDJcbiAgICBAZHJhZ1N0YXJ0ID0gdW5kZWZpbmVkXG4gICAgQHNjYWxlRmFjdG9yID0gMS4xXG4gICAgQGNsZWFyKClcbiAgICBcblxuICBwYWludDogKGxheWVyKSAtPlxuICAgIEByZXNldENhbnZhcygpIGlmIEB3aWR0aCA9PSAwICMgTWFrZSBzdXJlIGNhbnZhcyBpcyB2aXNpYmxlXG4gICAgZGF0YSA9IGxheWVyLnNsaWNlKHRoaXMsIEB2aWV3ZXIpXG4gICAgY29scyA9IGxheWVyLmNvbG9yTWFwLm1hcChkYXRhKVxuICAgIGltZyA9IGxheWVyLmltYWdlXG4gICAgZGltcyA9IFtbaW1nLnksIGltZy56XSwgW2ltZy54LCBpbWcuel0sIFtpbWcueCwgaW1nLnldXVxuICAgIHhDZWxsID0gQHdpZHRoIC8gZGltc1tAZGltXVswXVxuICAgIHlDZWxsID0gQGhlaWdodCAvIGRpbXNbQGRpbV1bMV1cbiAgICBAeENlbGwgPSB4Q2VsbFxuICAgIEB5Q2VsbCA9IHlDZWxsXG4gICAgZnV6eiA9IDAuNSAgIyBOZWVkIHRvIGV4cGFuZCBwYWludCByZWdpb24gdG8gYXZvaWQgZ2Fwc1xuICAgIEBjb250ZXh0Lmdsb2JhbEFscGhhID0gbGF5ZXIub3BhY2l0eVxuICAgIEBjb250ZXh0LmxpbmVXaWR0aCA9IDFcbiAgICBmb3IgaSBpbiBbMC4uLmRpbXNbQGRpbV1bMV1dXG4gICAgICBmb3IgaiBpbiBbMC4uLmRpbXNbQGRpbV1bMF1dXG4gICAgICAgIGNvbnRpbnVlIGlmIHR5cGVvZiBkYXRhW2ldW2pdIGlzIGB1bmRlZmluZWRgIHwgZGF0YVtpXVtqXSBpcyAwXG4gICAgICAgIHhwID0gQHdpZHRoIC0gKGogKyAxKSAqIHhDZWxsICMtIHhDZWxsXG4gICAgICAgIHlwID0gQGhlaWdodCAtIChpICsgMSkgKiB5Q2VsbFxuICAgICAgICBjb2wgPSBjb2xzW2ldW2pdXG4gICAgICAgIEBjb250ZXh0LmZpbGxTdHlsZSA9IGNvbFxuICAgICAgICBAY29udGV4dC5maWxsUmVjdCB4cCwgeXAsIHhDZWxsK2Z1enosIHlDZWxsK2Z1enpcbiAgICBAY29udGV4dC5nbG9iYWxBbHBoYSA9IDEuMFxuICAgIGlmIEBzbGlkZXI/XG4gICAgICB2YWwgPSBAdmlld2VyLmNvb3Jkc19hYmNbQGRpbV1cbiAgICAgIHZhbCA9ICgxIC0gdmFsKSB1bmxlc3MgQGRpbSA9PSBWaWV3ZXIuWEFYSVMgXG4gICAgICAkKEBzbGlkZXIuZWxlbWVudCkuc2xpZGVyKCdvcHRpb24nLCAndmFsdWUnLCB2YWwpXG5cblxuICBkcmF3Q3Jvc3NoYWlyczogKCkgLT5cbiAgICBjaCA9IEB2aWV3U2V0dGluZ3MuY3Jvc3NoYWlyc1xuICAgIHJldHVybiB1bmxlc3MgY2gudmlzaWJsZVxuICAgIEBjb250ZXh0LmZpbGxTdHlsZSA9IGNoLmNvbG9yXG4gICAgeFBvcyA9IEB2aWV3ZXIuY29vcmRzX2FiY1tbMSwwLDBdW0BkaW1dXSpAd2lkdGhcbiAgICB5UG9zID0gKEB2aWV3ZXIuY29vcmRzX2FiY1tbMiwyLDFdW0BkaW1dXSkqQGhlaWdodFxuICAgIEBjb250ZXh0LmZpbGxSZWN0IDAsIHlQb3MgLSBjaC53aWR0aC8yLCBAd2lkdGgsIGNoLndpZHRoXG4gICAgQGNvbnRleHQuZmlsbFJlY3QgeFBvcyAtIGNoLndpZHRoLzIsIDAsIGNoLndpZHRoLCBAaGVpZ2h0XG5cblxuICAjIEFkZCBvcmllbnRhdGlvbiBsYWJlbHMgdG8gWC9ZL1ogc2xpY2VzXG4gIGRyYXdMYWJlbHM6ICgpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAdmlld1NldHRpbmdzLmxhYmVsc0VuYWJsZWRcbiAgICBmb250U2l6ZSA9IE1hdGgucm91bmQoQGhlaWdodC8xNSlcbiAgICBAY29udGV4dC5maWxsU3R5bGUgPSAnd2hpdGUnXG4gICAgQGNvbnRleHQuZm9udCA9IFwiI3tmb250U2l6ZX1weCBIZWx2ZXRpY2FcIlxuXG4gICAgIyBTaG93IGN1cnJlbnQgcGxhbmVcbiAgICBAY29udGV4dC50ZXh0QWxpZ24gPSAnbGVmdCdcbiAgICBAY29udGV4dC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJ1xuICAgIHBsYW5lUG9zID0gQHZpZXdlci5jb29yZHNfeHl6KClbQGRpbV1cbiAgICBwbGFuZVBvcyA9ICcrJyArIHBsYW5lUG9zIGlmIHBsYW5lUG9zID4gMFxuICAgIHBsYW5lVGV4dCA9IFsneCcsJ3knLCd6J11bQGRpbV0gKyAnID0gJyArIHBsYW5lUG9zXG4gICAgQGNvbnRleHQuZmlsbFRleHQocGxhbmVUZXh0LCAwLjAzKkB3aWR0aCwgMC45NSpAaGVpZ2h0KVxuXG4gICAgIyBBZGQgb3JpZW50YXRpb24gbGFiZWxzXG4gICAgQGNvbnRleHQudGV4dEFsaWduID0gJ2NlbnRlcidcbiAgICAjIEBjb250ZXh0LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnXG4gICAgc3dpdGNoIEBkaW1cbiAgICAgIHdoZW4gMFxuICAgICAgICBAY29udGV4dC5maWxsVGV4dCgnQScsIDAuMDUqQHdpZHRoLCAwLjUqQGhlaWdodClcbiAgICAgICAgQGNvbnRleHQuZmlsbFRleHQoJ1AnLCAwLjk1KkB3aWR0aCwgMC41KkBoZWlnaHQpXG4gICAgICB3aGVuIDFcbiAgICAgICAgQGNvbnRleHQuZmlsbFRleHQoJ0QnLCAwLjk1KkB3aWR0aCwgMC4wNSpAaGVpZ2h0KVxuICAgICAgICBAY29udGV4dC5maWxsVGV4dCgnVicsIDAuOTUqQHdpZHRoLCAwLjk1KkBoZWlnaHQpXG4gICAgICB3aGVuIDJcbiAgICAgICAgQGNvbnRleHQuZmlsbFRleHQoJ0wnLCAwLjA1KkB3aWR0aCwgMC4wNSpAaGVpZ2h0KVxuICAgICAgICBAY29udGV4dC5maWxsVGV4dCgnUicsIDAuOTUqQHdpZHRoLCAwLjA1KkBoZWlnaHQpXG5cblxuICAjIFBhc3MgdGhyb3VnaCBkYXRhIGZyb20gYSBuYXYgc2xpZGVyIGV2ZW50IHRvIHRoZSB2aWV3ZXIgZm9yIHBvc2l0aW9uIHVwZGF0ZVxuICBuYXZTbGlkZUNoYW5nZTogKHZhbHVlKSAtPlxuICAgIHZhbHVlID0gKDEgLSB2YWx1ZSkgdW5sZXNzIEBkaW0gPT0gVmlld2VyLlhBWElTXG4gICAgQHZpZXdlci5tb3ZlVG9WaWV3ZXJDb29yZHMoQGRpbSwgdmFsdWUpXG5cblxuICAjIEtsdWRneSB3YXkgb2YgYXBwbHlpbmcgYSBncmlkOyBpbiBmdXR1cmUgdGhpcyBzaG91bGQgYmUgYWJzdHJhY3RlZFxuICAjIGF3YXkgaW50byBhIFZpZXdTZXR0aW5ncyBjbGFzcyB0aGF0IHN0b3JlcyBhbGwgdGhlIGRpbWVuc2lvbi9vcmllbnRhdGlvblxuICAjIGluZm8gYW5kIHJldHVybnMgZHluYW1pYyB0cmFuc2Zvcm1hdGlvbiBtZXRob2RzLlxuICBfc25hcFRvR3JpZDogKHgsIHkpIC0+XG4gICAgZGltcyA9IFs5MSwgMTA5LCA5MV1cbiAgICBkaW1zLnNwbGljZShAZGltLCAxKVxuICAgIHhWb3hTaXplID0gMSAvIGRpbXNbMF1cbiAgICB5Vm94U2l6ZSA9IDEgLyBkaW1zWzFdXG4gICAgIyB4Vm94U2l6ZSA9IEB4Q2VsbFxuICAgICMgeVZveFNpemUgPSBAeUNlbGxcbiAgICB4ID0gKE1hdGguZmxvb3IoeC94Vm94U2l6ZSkgKyAwLjUpKnhWb3hTaXplXG4gICAgeSA9IChNYXRoLmZsb29yKHkveVZveFNpemUpICsgMC41KSp5Vm94U2l6ZVxuICAgIHJldHVybiB7IHg6IHgsIHk6IHkgfVxuXG4gICAgICBcbiAgX2pRdWVyeUluaXQ6IC0+XG4gICAgY2FudmFzID0gJChAZWxlbWVudCkuZmluZCgnY2FudmFzJylcbiAgICBjYW52YXMuY2xpY2sgQF9jYW52YXNDbGlja1xuICAgIGNhbnZhcy5tb3VzZWRvd24oKGV2dCkgPT5cbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUubW96VXNlclNlbGVjdCA9IGRvY3VtZW50LmJvZHkuc3R5bGUud2Via2l0VXNlclNlbGVjdCA9IGRvY3VtZW50LmJvZHkuc3R5bGUudXNlclNlbGVjdCA9IFwibm9uZVwiXG4gICAgICBAbGFzdFggPSBldnQub2Zmc2V0WCBvciAoZXZ0LnBhZ2VYIC0gY2FudmFzLm9mZnNldCgpLmxlZnQpXG4gICAgICBAbGFzdFkgPSBldnQub2Zmc2V0WSBvciAoZXZ0LnBhZ2VZIC0gY2FudmFzLm9mZnNldCgpLnRvcClcbiAgICAgIEBkcmFnU3RhcnQgPSBAY29udGV4dC50cmFuc2Zvcm1lZFBvaW50KEBsYXN0WCwgQGxhc3RZKVxuICAgIClcbiAgICBjYW52YXMubW91c2Vtb3ZlKChldnQpID0+XG4gICAgICByZXR1cm4gdW5sZXNzIEB2aWV3U2V0dGluZ3MucGFuem9vbUVuYWJsZWRcbiAgICAgIEBsYXN0WCA9IGV2dC5vZmZzZXRYIG9yIChldnQucGFnZVggLSBjYW52YXMub2Zmc2V0KCkubGVmdClcbiAgICAgIEBsYXN0WSA9IGV2dC5vZmZzZXRZIG9yIChldnQucGFnZVkgLSBjYW52YXMub2Zmc2V0KCkudG9wKVxuICAgICAgaWYgQGRyYWdTdGFydFxuICAgICAgICBwdCA9IEBjb250ZXh0LnRyYW5zZm9ybWVkUG9pbnQoQGxhc3RYLCBAbGFzdFkpXG4gICAgICAgIEBjb250ZXh0LnRyYW5zbGF0ZSBwdC54IC0gQGRyYWdTdGFydC54LCBwdC55IC0gQGRyYWdTdGFydC55XG4gICAgICAgIEB2aWV3ZXIucGFpbnQoKVxuICAgIClcbiAgICBjYW52YXMubW91c2V1cCgoZXZ0KSA9PlxuICAgICAgQGRyYWdTdGFydCA9IG51bGxcbiAgICApXG4gICAgY2FudmFzLm9uKFwiRE9NTW91c2VTY3JvbGxcIiwgQF9oYW5kbGVTY3JvbGwpXG4gICAgY2FudmFzLm9uKFwibW91c2V3aGVlbFwiLCBAX2hhbmRsZVNjcm9sbClcblxuXG4gIF9jYW52YXNDbGljazogKGUpID0+XG4gICAgJChAdmlld2VyKS50cmlnZ2VyKCdiZWZvcmVDbGljaycpXG4gICAgY2xpY2tYID0gZS5vZmZzZXRYIG9yIChlLnBhZ2VYIC0gJChAZWxlbWVudCkub2Zmc2V0KCkubGVmdClcbiAgICBjbGlja1kgPSBlLm9mZnNldFkgb3IgKGUucGFnZVkgLSAkKEBlbGVtZW50KS5vZmZzZXQoKS50b3ApXG4gICAgcHQgPSBAY29udGV4dC50cmFuc2Zvcm1lZFBvaW50KGNsaWNrWCwgY2xpY2tZKVxuICAgIGN4ID0gcHQueCAvIEB3aWR0aFxuICAgIGN5ID0gcHQueSAvIEBoZWlnaHRcbiAgICBwdCA9IEBfc25hcFRvR3JpZChjeCwgY3kpXG4gICAgQHZpZXdlci5tb3ZlVG9WaWV3ZXJDb29yZHMoQGRpbSwgcHQueCwgcHQueSlcbiAgICAkKEB2aWV3ZXIpLnRyaWdnZXIoJ2FmdGVyQ2xpY2snKVxuXG5cbiAgX3pvb206IChjbGlja3MpID0+XG4gICAgcmV0dXJuIHVubGVzcyBAdmlld1NldHRpbmdzLnBhbnpvb21FbmFibGVkXG4gICAgcHQgPSBAY29udGV4dC50cmFuc2Zvcm1lZFBvaW50KEBsYXN0WCwgQGxhc3RZKVxuICAgIEBjb250ZXh0LnRyYW5zbGF0ZSBwdC54LCBwdC55XG4gICAgZmFjdG9yID0gTWF0aC5wb3coQHNjYWxlRmFjdG9yLCBjbGlja3MpXG4gICAgQGNvbnRleHQuc2NhbGUgZmFjdG9yLCBmYWN0b3JcbiAgICBAY29udGV4dC50cmFuc2xhdGUgLXB0LngsIC1wdC55XG4gICAgQHZpZXdlci5wYWludCgpXG5cblxuICBfaGFuZGxlU2Nyb2xsOiAoZXZ0KSA9PlxuICAgIG9lID0gZXZ0Lm9yaWdpbmFsRXZlbnRcbiAgICBkZWx0YSA9IChpZiBvZS53aGVlbERlbHRhIHRoZW4gKG9lLndoZWVsRGVsdGEgLyA0MCkgZWxzZSAoaWYgb2UuZGV0YWlsIHRoZW4gLW9lLmRldGFpbCBlbHNlIDApKVxuICAgIEBfem9vbSBkZWx0YSAgaWYgZGVsdGFcbiAgICBldnQucHJldmVudERlZmF1bHQoKSBhbmQgZmFsc2VcblxuXG5cbmNsYXNzIENyb3NzaGFpcnNcblxuICBjb25zdHJ1Y3RvcjogKEB2aXNpYmxlPXRydWUsIEBjb2xvcj0nbGltZScsIEB3aWR0aD0xKSAtPlxuXG5cblxuY2xhc3MgQ29sb3JNYXBcblxuICAjIEZvciBub3csIHBhbGV0dGVzIGFyZSBoYXJkLWNvZGVkLiBTaG91bGQgZXZlbnR1YWxseSBhZGQgZmFjaWxpdHkgZm9yXG4gICMgcmVhZGluZyBpbiBhZGRpdGlvbmFsIHBhbGV0dGVzIGZyb20gZmlsZSBhbmQvb3IgY3JlYXRpbmcgdGhlbSBpbi1icm93c2VyLlxuICBAUEFMRVRURVMgPVxuICAgIGdyYXlzY2FsZTogWycjMDAwMDAwJywnIzMwMzAzMCcsJ2dyYXknLCdzaWx2ZXInLCd3aGl0ZSddXG4gICMgQWRkIG1vbm9jaHJvbWUgcGFsZXR0ZXNcbiAgYmFzaWMgPSBbJ3JlZCcsICdncmVlbicsICdibHVlJywgJ3llbGxvdycsICdwdXJwbGUnLCAnbGltZScsICdhcXVhJywgJ25hdnknXVxuICBmb3IgY29sIGluIGJhc2ljXG4gICAgQFBBTEVUVEVTW2NvbF0gPSBbJ2JsYWNrJywgY29sLCAnd2hpdGUnXVxuICAjIEFkZCBzb21lIG90aGVyIHBhbGV0dGVzXG4gICQuZXh0ZW5kKEBQQUxFVFRFUywge1xuICAgICdpbnRlbnNlIHJlZC1ibHVlJzogWycjMDUzMDYxJywgJyMyMTY2QUMnLCAnIzQzOTNDMycsICcjRjdGN0Y3JywgJyNENjYwNEQnLCAnI0IyMTgyQicsICcjNjcwMDFGJ11cbiAgICAncmVkLXllbGxvdy1ibHVlJzogWycjMzEzNjk1JywgJyM0NTc1QjQnLCAnIzc0QUREMScsICcjRkZGRkJGJywgJyNGNDZENDMnLCAnI0Q3MzAyNycsICcjQTUwMDI2J11cbiAgICAnYnJvd24tdGVhbCc6IFsnIzAwM0MzMCcsICcjMDE2NjVFJywgJyMzNTk3OEYnLCAnI0Y1RjVGNScsICcjQkY4MTJEJywgJyM4QzUxMEEnLCAnIzU0MzAwNSddXG4gIH0pXG5cbiAgXG4gIGNvbnN0cnVjdG9yOiAoQG1pbiwgQG1heCwgQHBhbGV0dGUgPSAnaG90IGFuZCBjb2xkJywgQHN0ZXBzID0gNDApIC0+XG4gICAgQHJhbmdlID0gQG1heCAtIEBtaW5cbiAgICBAY29sb3JzID0gQHNldENvbG9ycyhDb2xvck1hcC5QQUxFVFRFU1tAcGFsZXR0ZV0pXG5cblxuICAjIE1hcCB2YWx1ZXMgdG8gY29sb3JzLiBDdXJyZW50bHkgdXNlcyBhIGxpbmVhciBtYXBwaW5nOyAgY291bGQgYWRkIG9wdGlvblxuICAjIHRvIHVzZSBvdGhlciBtZXRob2RzLlxuICBtYXA6IChkYXRhKSAtPlxuICAgIHJlcyA9IFtdXG4gICAgZm9yIGkgaW4gWzAuLi5kYXRhLmxlbmd0aF1cbiAgICAgIHJlc1tpXSA9IGRhdGFbaV0ubWFwICh2KSA9PlxuICAgICAgICBAY29sb3JzW01hdGguZmxvb3IoKCh2LUBtaW4pL0ByYW5nZSkgKiBAc3RlcHMpXVxuICAgIHJldHVybiByZXNcblxuXG4gICMgVGFrZXMgYSBzZXQgb2YgZGlzY3JldGUgY29sb3IgbmFtZXMvZGVzY3JpcHRpb25zIGFuZCByZW1hcHMgdGhlbSB0b1xuICAjIGEgc3BhY2Ugd2l0aCBAc3RlcHMgZGlmZmVyZW50IGNvbG9ycy5cbiAgc2V0Q29sb3JzOiAoY29sb3JzKSAtPlxuICAgIHJhaW5ib3cgPSBuZXcgUmFpbmJvdygpXG4gICAgcmFpbmJvdy5zZXROdW1iZXJSYW5nZSgxLCBAc3RlcHMpXG4gICAgcmFpbmJvdy5zZXRTcGVjdHJ1bS5hcHBseShudWxsLCBjb2xvcnMpXG4gICAgY29sb3JzID0gW11cbiAgICBjb2xvcnMucHVzaCByYWluYm93LmNvbG91ckF0KGkpIGZvciBpIGluIFsxLi4uQHN0ZXBzXVxuICAgIHJldHVybiBjb2xvcnMubWFwIChjKSAtPiBcIiNcIiArIGNcblxuXG5cbmNsYXNzIENvbXBvbmVudFxuXG4gIGNvbnN0cnVjdG9yOiAoQGNvbnRhaW5lciwgQG5hbWUsIEBlbGVtZW50KSAtPlxuICAgICQoQGVsZW1lbnQpLmNoYW5nZSgoZSkgPT5cbiAgICAgIEBjb250YWluZXIuc2V0dGluZ3NDaGFuZ2VkKClcbiAgICApXG5cbiAgZ2V0VmFsdWU6IC0+XG4gICAgJChAZWxlbWVudCkudmFsKClcblxuICBzZXRWYWx1ZTogKHZhbHVlKSAtPlxuICAgICQoQGVsZW1lbnQpLnZhbCh2YWx1ZSlcblxuICBzZXRFbmFibGVkOiAoc3RhdHVzKSAtPlxuICAgIHN0YXR1cyA9IGlmIHN0YXR1cyB0aGVuICcnIGVsc2UgJ2Rpc2FibGVkJ1xuICAgICQoQGVsZW1lbnQpLmF0dHIoJ2Rpc2FibGVkJywgc3RhdHVzKVxuXG5cblxuIyBBIFNsaWRlciBjbGFzcy0td3JhcHMgYXJvdW5kIGpRdWVyeS11aSBzbGlkZXJcbmNsYXNzIFNsaWRlckNvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudFxuXG4gIGNvbnN0cnVjdG9yOiAoQGNvbnRhaW5lciwgQG5hbWUsIEBlbGVtZW50LCBAb3JpZW50YXRpb24sIEBtaW4sIEBtYXgsIEB2YWx1ZSwgQHN0ZXApIC0+XG4gICAgQHJhbmdlID0gaWYgQG5hbWUubWF0Y2goL3RocmVzaG9sZC9nKSB0aGVuICdtYXgnXG4gICAgZWxzZSBpZiBAbmFtZS5tYXRjaCgvbmF2L2cpIHRoZW4gZmFsc2VcbiAgICBlbHNlICdtaW4nXG4gICAgQF9qUXVlcnlJbml0KClcblxuICBjaGFuZ2U6IChlLCB1aSkgPT5cbiAgICAjIEZvciBuYXYgc2xpZGVycywgdHJpZ2dlciBjb29yZGluYXRlIHVwZGF0ZVxuICAgIGlmIEBuYW1lLm1hdGNoKC9uYXYvZylcbiAgICAgIEBjb250YWluZXIubmF2U2xpZGVDaGFuZ2UodWkudmFsdWUpXG4gICAgZWxzZVxuICAgICAgIyBGb3IgdmlzdWFsIHNldHRpbmdzIHNsaWRlcnMsIHRyaWdnZXIgZ2VuZXJhbCBVSSB1cGRhdGVcbiAgICAgIEBjb250YWluZXIuc2V0dGluZ3NDaGFuZ2VkKGUpXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuXG4gIF9qUXVlcnlJbml0OiAtPlxuICAgICQoQGVsZW1lbnQpLnNsaWRlcihcbiAgICAgIHtcbiAgICAgICAgb3JpZW50YXRpb246IEBvcmllbnRhdGlvblxuICAgICAgICByYW5nZTogQHJhbmdlXG4gICAgICAgIG1pbjogQG1pblxuICAgICAgICBtYXg6IEBtYXhcbiAgICAgICAgc3RlcDogQHN0ZXBcbiAgICAgICAgc2xpZGU6IEBjaGFuZ2VcbiAgICAgICAgdmFsdWU6IEB2YWx1ZVxuICAgICAgfVxuICAgIClcblxuICBnZXRWYWx1ZTogKCkgLT5cbiAgICAkKEBlbGVtZW50KS5zbGlkZXIoJ3ZhbHVlJylcblxuICBzZXRWYWx1ZTogKHZhbHVlKSAtPlxuICAgICQoQGVsZW1lbnQpLnNsaWRlcigndmFsdWUnLCB2YWx1ZSlcbiAgICBAdGV4dEZpZWxkLnNldFZhbHVlKHZhbHVlKSBpZiBAdGV4dEZpZWxkP1xuXG4gICMgU2V0IHRoZSBtaW4gYW5kIG1heFxuICBzZXRSYW5nZTogKEBtaW4sIEBtYXgpIC0+XG4gICAgJChAZWxlbWVudCkuc2xpZGVyKCdvcHRpb24nLCB7bWluOiBAbWluLCBtYXg6IEBtYXh9KVxuXG4gIGF0dGFjaFRleHRGaWVsZDogKEB0ZXh0RmllbGQpIC0+XG5cblxuXG5jbGFzcyBTZWxlY3RDb21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnRcblxuICBjb25zdHJ1Y3RvcjogKEBjb250YWluZXIsIEBuYW1lLCBAZWxlbWVudCwgb3B0aW9ucykgLT5cbiAgICAkKEBlbGVtZW50KS5lbXB0eSgpXG4gICAgZm9yIG8gaW4gb3B0aW9uc1xuICAgICAgJChAZWxlbWVudCkuYXBwZW5kKCQoJzxvcHRpb24+PC9vcHRpb24+JykudGV4dChvKS52YWwobykpXG4gICAgc3VwZXIoQGNvbnRhaW5lciwgQG5hbWUsIEBlbGVtZW50KVxuXG5cblxuY2xhc3MgVGV4dEZpZWxkQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50XG5cbiAgY29uc3RydWN0b3I6IChAY29udGFpbmVyLCBAbmFtZSwgQGVsZW1lbnQsIEBzbGlkZXIgPSBudWxsKSAtPlxuICAgICMgc3VwZXIoQGNvbnRhaW5lciwgQG5hbWUsIEBlbGVtZW50KVxuICAgICMgSWYgdGhlIGZpZWxkIGlzIGF0dGFjaGVkIHRvIGEgc2xpZGVyLCBhZGQgYXBwcm9wcmlhdGUgZXZlbnQgaGFuZGxlcnMuXG4gICAgaWYgQHNsaWRlcj9cbiAgICAgIEBzZXRWYWx1ZShAc2xpZGVyLmdldFZhbHVlKCkpXG5cbiAgICAgICQoQGVsZW1lbnQpLmNoYW5nZSgoZSkgPT5cbiAgICAgICAgdiA9IEBnZXRWYWx1ZSgpXG4gICAgICAgIGlmICQuaXNOdW1lcmljKHYpXG4gICAgICAgICAgaWYgdiA8IEBzbGlkZXIubWluXG4gICAgICAgICAgICB2ID0gQHNsaWRlci5taW5cbiAgICAgICAgICBlbHNlIGlmIHYgPiBAc2xpZGVyLm1heFxuICAgICAgICAgICAgdiA9IEBzbGlkZXIubWF4XG4gICAgICAgICAgQHNldFZhbHVlKHYpXG4gICAgICAgICAgQHNsaWRlci5zZXRWYWx1ZSh2KVxuICAgICAgICAgIEBjb250YWluZXIuc2V0dGluZ3NDaGFuZ2VkKGUpXG4gICAgICApXG4gICAgICAkKEBzbGlkZXIuZWxlbWVudCkub24oJ3NsaWRlJywgKGUpID0+XG4gICAgICAgIEBzZXRWYWx1ZShAc2xpZGVyLmdldFZhbHVlKCkpXG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIClcblxuICAjIE92ZXJyaWRlIGRlZmF1bHQgYmVjYXVzZSB1bmVkaXRhYmxlIGZpZWxkcyB1c2UgdGV4dCgpIGluc3RlYWQgb2YgdmFsKClcbiAgc2V0VmFsdWU6ICh2YWx1ZSkgLT5cbiAgICAkKEBlbGVtZW50KS52YWwodmFsdWUpXG4gICAgJChAZWxlbWVudCkudGV4dCh2YWx1ZSlcblxuXG5jbGFzcyBEYXRhRmllbGRcblxuICBjb25zdHJ1Y3RvcjogKEBwYW5lbCwgQG5hbWUsIEBlbGVtZW50KSAtPlxuXG5cblxuXG4iXX0=