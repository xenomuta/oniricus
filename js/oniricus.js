/**
 * Oniricus
 * visuales para el demo Deshollywoodzando el hacker
 * Barcamp Santiago 2014
 */

/**
 * variables globales
 */
var cnv, // el canvas
  mic, // el microfono
  hud, // mira del hud
  camara, // la camara
  mascara, // mascara de oscuridad "solo cara"
  barcamp, // logo barcamp
  leapMotion = typeof Leap === 'object', // leap motion
  /**
   * socket.io para manejar eventos de backend
   * no ready para el demo  :(
   * socket = io.connect(top.location.origin);
   */
  barrasAudio = new Array(10), // visual del Audio
  tiempo = new Date('2014-11-29T20:00:00Z'), // tiempo restante
  mostrarTiempo = false,
  activarHud = true,
  ultimaAccion = '',
  ultimoSwipe = Date.now(), // limita los swipes a x por segundo
  modo = 'SLIDES'; // modo

// precargar las imagenes
function preload() {
  barcamp = loadImage("img/barcamp.png");
  mascara = loadImage("img/alpha-mask.png");
  hud = loadImage("img/hud.png");
}

// setup principal
function setup() {
  camara = createCapture(VIDEO);
  camara.size(320, 240);
  camara.position(0, 0);
  camara.hide();

  mic = new p5.AudioIn();
  mic.start();

  // preparar canvas
  cnv = createCanvas(320, 240);
  cnv.position(0, 0);
  setTimeout(function () {
    $('canvas').removeClass('zoom').addClass('giro');
  }, 100);

  // tracker facial
  ctracker = new clm.tracker();
  ctracker.init(pModel);
  ctracker.start(camara.elt);

  inicializarLeapMotion();

  noFill();
  textFont('VT323');
}


function draw() {
  clear();
  var cara = deteccionFacial();

  // Girar eje X a frames de video (modo espejo)
  var c = document.querySelector('canvas');
  // var ctx = c.getContext('2d');
  // ctx.translate(cnv.width, 0);
  // ctx.scale(-1, 1);

  // Mostrar video
  image(camara, 0, 0);

  // Vista de Cabina (oscuro)
  // vistaCabina(cara);

  // Vista del HUD onirico
  vistaOniricus(cara);

  // Gira del eje X a normal para texto
  ctx.translate(cnv.width, 0);
  ctx.scale(-1, 1);

  noStroke();
  // Detectar operador en cabina
  if (!cara) {
    // Parpadea cada segundo
    if ((Date.now() % 1000) > 500) {
      textSize(32);
      var msg = 'OPERATOR OFFLINE!';
      fill(color(0));
      text(msg, 160 - (textWidth(msg) / 2), 120 - 17);
      fill(color(255, 64, 0, 255));
      text(msg, 160 - (textWidth(msg) / 2), 120 - 16);
    }
  } else {
    // Mostrar tiempo
    if (mostrarTiempo) {
      var m = map(Date.now() - mostrarTiempo, 0, 700, 2, .2);
      var str = (function () {
        var now = new Date;
        var days = (tiempo - now) / 1000 / 60 / 60 / 24;
        days = Math.floor(days);
        var hours = (tiempo - now) / 1000 / 60 / 60 - (24 * days);
        hours = Math.floor(hours);
        var minutes = (tiempo - now) / 1000 / 60 - (24 * 60 * days) - (60 * hours);
        minutes = Math.floor(minutes);
        var seconds = (tiempo - now) / 1000 - (24 * 60 * 60 * days) - (60 * 60 * hours) - (60 * minutes);
        seconds = Math.round(seconds);
        return [days, hours, minutes, seconds].map(function (n) {
          n = n.toString();
          return n.length < 2 ? '0' + n : n;
        }).join((Date.now() % 1000) < 500 ? ' ' : ':') + '.' + (Date.now() % 100).toString().substr(0, 3);
      })();
      [color(0, 0, 0, 64), color(64, 255, 32, 128)].forEach(function (c, _i) {
        push();
        translate(160 - ((textWidth(str) * m) / 2), cnv.height * .75);
        scale(m, m);
        fill(_i == 0 ? c : color(255, 255, 255, 240));
        stroke(color(255, 255, 255, 240));
        noStroke();

        strokeWeight(1);
        fill(color(255, 0, 0, 64));
        rect(0, 0 - 60, textWidth(str) * 2, 50);

        noStroke();
        textSize(14);
        fill(color(255, 255, 255, 128));
        text('TIEMPO RESTANTE:', 0 + 5, 0 - 45);

        textSize(20);
        text(str, 5, -30);
        pop();
      });
    }
  }

  if (ultimaAccion) {
    textSize(32);
    fill(color(255, 255, 0, 255));
    noStroke();
    text(ultimaAccion, 160 - (textWidth(ultimaAccion) / 2), 120 - 16);
  }

  var fps = frameRate().toFixed(2);
  if (fps.length < 5) fps = '0' + fps;
  image(barcamp, 3, 3);
  var msg = 'ONIRICUS @' + fps + 'fps / accion:' + ultimaAccion;
  textSize(22);
  fill(color(0));
  text(msg, canvas.width - (textWidth(msg) + 20), canvas.height - 1);
  fill(color(128, 255, 0, 255));
  text(msg, canvas.width - (textWidth(msg) + 20), canvas.height);
}

function deteccionFacial(detectarPuntos) {
  // deteccion posiciones puntos faciales
  var pos = ctracker.getCurrentPosition();
  if (!pos || !pos.length) return undefined;
  if (detectarPuntos) {
    // Encuentra pos
    fill(color(255, 0, 0));
    for (var i = 0; i < pos.length; i++) {
      if (detectarPuntos.indexOf(i) === -1) continue;
      ellipse(pos[i][0], pos[i][1], 20, 20);
    }
  }

  // Ubicacion segun los puntos:
  // http://auduno.github.io/clmtrackr/media/facemodel_numbering_new.png
  var cara = {
    ojoDerecho: {
      x: pos[27][0],
      y: pos[27][1],
      d: Math.abs(dist(pos[29][0], pos[29][0], pos[31][0], pos[31][0]))
    },
    ojoIzquierdo: {
      x: pos[32][0],
      y: pos[32][1]
    },
    centro: {
      x: pos[62][0],
      y: pos[62][1]
    }
  };

  // Si se aleja mas de 100 pixeles del centro, descarta.
  if (Math.abs(dist(cara.ojoDerecho.x, cara.ojoDerecho.y, 160, 120)) > 100) {
    return undefined;
  }
  return cara;
}

// HUD "realidad aumentada" de hollywood
function vistaOniricus(cara) {
  if (!cara) {
    console.log('no face');
    return;
  }

  var td = Math.abs(dist(cara.ojoDerecho.x, cara.ojoDerecho.y, cara.ojoIzquierdo.x, cara.ojoIzquierdo.y)),
    d = dist(160, 120, cara.centro.x, cara.centro.y);

  noFill();
  [color(0, 0, 0, 64), color(64, 255, 32, 128)].forEach(function (c, _i) {
    strokeWeight(((1 - _i) * 3) + 1);
    noFill();
    stroke(c);

    // Figura verde rotatoria
    beginShape();
    for (var a = 0; a < 360; a += 60) {
      var _a = (a + (Date.now() / 100)) % 360;
      var x = cara.ojoDerecho.x + (sin(_a * (PI / 180)) * td) - (td / 3);
      var y = cara.ojoDerecho.y + (cos(_a * (PI / 180)) * td);
      vertex(x, y);
    }
    endShape(CLOSE);

    if (activarHud) {
      blendMode(ADD);
      imageMode(CENTER);
      image(hud, cara.ojoDerecho.x, cara.ojoDerecho.y);
      imageMode(CORNER);
      blendMode(BLEND);
      // feo y viejo
      /*
        beginShape();
        fill(color(red(c), green(c), blue(c), alpha(c) / 2));
        for (var a = 0; a < 360; a += 45) {
          var _a = (a + (Date.now() / 10)) % 360;
          var _r = map(cara.ojoDerecho.d, 1, 14, 2.5, .5);
          var x = cara.ojoDerecho.x + (sin(_a * (PI / 180)) * td * _r) - (td / 3);
          var y = cara.ojoDerecho.y + (cos(_a * (PI / 180)) * td * _r);
          vertex(x, y);
        }
        noFill();
        endShape(CLOSE);

        beginShape();
        strokeWeight(10);
        stroke(color(128, 32, 8, 64));
        for (var a = 0; a < 360; a += 20) {
          var _a = 360 - (a + (Date.now() / 30)) % 360;
          var _r = map(cara.ojoDerecho.d, 1, 14, 2.5, .1);
          var x = cara.centro.x + (sin(_a * (PI / 180)) * td * _r * .85) - (td / 3);
          var y = cara.centro.y + (cos(_a * (PI / 180)) * td * _r);
          vertex(x, y);
        }
        endShape(CLOSE);

        beginShape();
        strokeWeight(3);
        stroke(color(128, 32, 8, 240));
        for (var a = 0; a < 360; a += 20) {
          var _a = 360 - (a + (Date.now() / 20)) % 360;
          var x = cara.centro.x + (sin(_a * (PI / 180)) * td * 1.5) - (td / 3);
          var y = cara.centro.y + (cos(_a * (PI / 180)) * td * 1.8);
          vertex(x, y);
        }
        endShape(CLOSE);
        strokeWeight(1);
        for (var a = 0; a < 360; a += 20) {
          var _a = 360 - (a + (Date.now() / 20)) % 360;
          stroke(color(128, 32, 8, map(Math.random(), 0, 1, 32, 64)));
          var x = cara.centro.x + (sin(_a * (PI / 180)) * td * 1.5) - (td / 3);
          var y = cara.centro.y + (cos(_a * (PI / 180)) * td * 1.8);
          if (Math.random() > .7) {
            line(x, y, cara.ojoDerecho.x, cara.ojoDerecho.y);
          }
        }
*/
      // audio
      var l = mic.getLevel();
      var h = map(l, 0, 1, 0, 90);
      noStroke();
      fill(color(0));
      rect(14, 140, 25, -h - 2);
      fill(color(32, 128, 64, 128));
      rect(15, 140, 25, -h);
      rect(15, 140, 25, h);

      var respira = map(l, 0, 1, 0, 20);
      barrasAudio.pop();
      barrasAudio = [respira].concat(barrasAudio);
      barrasAudio.forEach(function (b, _i) {
        ellipse(cara.centro.x - (15 * _i), cara.centro.y + 60, b, b);
      });

    }

  });
}

function vistaCabina(cara) {
  noStroke();
  fill(color(0, 0, 0, 230));
  if (!cara) {
    rect(0, 0, cnv.width, cnv.height);
    return;
  }

  var x = cara.centro.x;
  var y = cara.centro.y;
  if (y + mascara.height < cnv.height / 3) {
    rect(0, 0, cnv.width, cnv.height);
    cara = undefined;
    return;
  }
  rect(0, 0, cnv.width, y - (mascara.height / 2));
  rect(0, y + (mascara.height / 2), cnv.width, cnv.height);

  // Mascara alpha
  imageMode(CENTER);
  image(mascara, x, y);
  imageMode(CORNER);
}

function inicializarLeapMotion() {
  if (leapMotion) {
    var controller = new Leap.Controller({
      enableGestures: true
    });
    controller.use('screenPosition');
    controller.loop(function (frame) {
      if (!frame && !frame.valid) {
        ultimaAccion = frame;
        return;
      }

      if (frame.hands.length == 2) {
        /*
          frame.hands.forEach(function (hand) {
          if (hand.pinchStrength > .85) {
            if (hand.type == 'left') {
              $('canvas').css('opacity', .3);
            } else {
              $('canvas').css('opacity', 1);
            }
          }
        });*/
        mostrarTiempo = Date.now();
      } else if (Date.now() - mostrarTiempo > 1000) {
        mostrarTiempo = false;
      }

      if (frame.gestures.length) {
        var circulos = frame.gestures.filter(function (g) {
          return g.type == 'circle' && g.state == 'start';
        });
        if (circulos.length && frame.hands.length == 1 && frame.hands[0].type == 'right') {
          var dir = frame.pointable(circulos[0].pointableIds[0]).direction;

          activarHud = Leap.vec3.dot(dir, circulos[0].normal) > 0;

          ultimaAccion = (activarHud ? 'A' : 'DESA') + 'CTIVAR HUD';
          setTimeout(function () {
            ultimaAccion = ''
          }, 3000);
        }

        var swipes = frame.gestures.filter(function (g) {
          return g.type == 'swipe' && g.state == 'start';
        });
        if (swipes.length) {
          var isHorizontal = Math.abs(swipes[0].direction[0]) > Math.abs(swipes[0].direction[1]);
          if (isHorizontal && frame.hands.length == 1 && frame.hands[0].type == 'right' && Date.now() - ultimoSwipe > 250) {
            ultimoSwipe = Date.now();
            var ifr = document.querySelector('#ifr'),
              rx = /\/(\d+)$/,
              pag = ifr.src.match(rx);
            if (modo == 'SLIDES' && pag && pag[1]) {
              pag = Number(pag[1]);
              if (swipes[0].direction[0] > 0) {
                ultimaAccion = 'ANTERIOR';
                pag--;
                if (pag < 0) pag = 0;
              } else {
                ultimaAccion = 'SIGUIENTE';
                pag++;
              }
              ifr.src = ifr.src.replace(rx, '/' + pag.toString());
            }
          } else if (frame.hands.length == 1 && frame.hands[0].type == 'left') { //vertical
            if (swipes[0].direction[1] > 0) {
              cambiarModo('SLIDES');
            } else {
              cambiarModo('CONSOLA');
            }
          }
          setTimeout(function () {
            ultimaAccion = ''
          }, 3000);
        }
      }
    });
  }
}

function cambiarModo(_modo) {
  if ((ultimaAccion = modo = _modo) == 'SLIDES') {
    $('canvas').removeClass('zoom').addClass('giro');
    $('#ifr').show();
  } else {
    $('canvas').addClass('zoom').removeClass('giro');
    $('#ifr').hide();
  }
}

var errors = [];
setInterval(function () {
  var e;
  while ((e = errors.shift())) {
    console.error(e);
  }
}, 1000);
window.onerror = function (err) {
  errors.push(err);
};
