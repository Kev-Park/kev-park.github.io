const canvas = document.querySelector("canvas");
const ctx = canvas.getContext('2d');

// for intro motion
let mouseMoved = false;



const pointer = {
    x: .5 * window.innerWidth,
    y: .5 * window.innerHeight,
}

const lastPosition = sessionStorage.getItem('lastCursorPosition');
if (lastPosition) {
  const { x, y } = JSON.parse(lastPosition);
  pointer.x = x;
  pointer.y = y;
}

const params = {
    pointsNumber: 40,
    widthFactor: .3,
    mouseThreshold: .6,
    spring: .4,
    friction: .5
};

const trail = new Array(params.pointsNumber);
for (let i = 0; i < params.pointsNumber; i++) {
    trail[i] = {
        x: pointer.x,
        y: pointer.y,
        dx: 0,
        dy: 0,
    }
}

window.addEventListener("click", e => {
    updateMousePosition(e.pageX, e.pageY);
});
window.addEventListener("mousemove", e => {
    mouseMoved = true;
    updateMousePosition(e.pageX, e.pageY);
});
window.addEventListener("touchmove", e => {
    mouseMoved = true;
    updateMousePosition(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
});

function updateMousePosition(eX, eY) {
    pointer.x = eX;
    pointer.y = eY;


    this.currentPosition = { 
      x: eX, 
      y: eY 
    };
    sessionStorage.setItem('lastCursorPosition', JSON.stringify(this.currentPosition));
    console.log("test");

}

setupCanvas();
update(0);
window.addEventListener("resize", setupCanvas);


function update(t) {

    // for intro motion
    if (!mouseMoved) {

        const lastPosition = sessionStorage.getItem('lastCursorPosition');
        if (lastPosition) {
          const { x, y } = JSON.parse(lastPosition);
          pointer.x = x;
          pointer.y = y;
        }
        else {
          pointer.x = 15*Math.cos(0.001*t) + window.innerWidth/2;
          pointer.y = 15*Math.sin(0.001*t) + window.innerHeight/2;
        }
    }

    ctx.strokeStyle = "#0C1B33";
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    trail.forEach((p, pIdx) => {
        const prev = pIdx === 0 ? pointer : trail[pIdx - 1];
        const spring = pIdx === 0 ? .4 * params.spring : params.spring;
        p.dx += (prev.x - p.x) * spring;
        p.dy += (prev.y - p.y) * spring;
        p.dx *= params.friction;
        p.dy *= params.friction;
        p.x += p.dx;
        p.y += p.dy;
    });

    ctx.lineCap = "round";
	 ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);

    for (let i = 1; i < trail.length - 1; i++) {
        const xc = .5 * (trail[i].x + trail[i + 1].x);
        const yc = .5 * (trail[i].y + trail[i + 1].y);
        ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
        ctx.lineWidth = params.widthFactor * (params.pointsNumber - i);
        ctx.stroke();
    }
    ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
    ctx.stroke();
    
    window.requestAnimationFrame(update);
}

function setupCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}