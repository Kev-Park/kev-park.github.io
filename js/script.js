// The cursor is drawn on a full-viewport canvas. A page that forgets to
// include one still gets a cursor: create it rather than throwing, which
// would take the navigation and video setup down with it.
const canvas = document.querySelector("canvas")
    || document.body.appendChild(document.createElement("canvas"));
const ctx = canvas.getContext('2d');

// for intro motion
let mouseMoved = false;

// set to true to bring back the trailing brush-stroke cursor
const trailEnabled = false;
const cursorRadius = 6;



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
    spring: 1.4,
    friction: .3
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

    if (!trailEnabled) {
        ctx.fillStyle = "#0C1B33";
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, cursorRadius, 0, 2 * Math.PI);
        ctx.fill();
        window.requestAnimationFrame(update);
        return;
    }

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

/* --- page setup -------------------------------------------------------
   Everything that has to run against the content currently in <body>. Called
   once on load, and again after every same-document navigation below. */
function setupPage() {
    setupViewers();
    stampYear();
}

/* Configure every <video> inside a .viewer so the markup only has to carry
   the src: no controls, muted (browsers block autoplay with sound), looping
   forever, and playing inline rather than fullscreen on mobile Safari. */
function setupViewers() {
    document.querySelectorAll(".viewer video").forEach(video => {
        video.controls = false;
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");            // older iOS reads the attribute
        video.setAttribute("disablepictureinpicture", "");
        video.setAttribute("preload", "metadata");

        const play = () => video.play().catch(() => {});  // ignore autoplay rejections
        play();
        video.addEventListener("loadeddata", play, { once: true });
    });
}

function stampYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll("#copyright .year").forEach(el => el.textContent = year);
}


/* --- same-document navigation -----------------------------------------
   A custom cursor belongs to a document. When a link builds a new one the
   browser paints the platform pointer for a frame or two before our styles
   become the active document's styles - the flash on every click. Replacing
   the body in place keeps one document alive for the whole site, so neither
   the cursor nor the canvas it is drawn on ever lapses.

   The entire <body> is swapped, so pages are free to differ however they
   like: nothing here knows about .right-content or any other region.

   Progressive enhancement - every page stays a real, directly loadable URL,
   and anything unexpected falls back to an ordinary navigation. */

history.scrollRestoration = "manual";

function isSwappable(link) {
    return !!link
        && link.origin === location.origin     // not mailto:, not an external site
        && !link.hasAttribute("download")
        && link.target !== "_blank"
        && /(\.html|\/)$/.test(link.pathname); // not a .pdf or other asset
}

document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;  // open in a new tab, etc
    if (!e.target.closest) return;

    const link = e.target.closest("a");
    if (!isSwappable(link)) return;

    const target = new URL(link.href);
    if (target.hash && target.pathname === location.pathname) return;  // in-page anchor

    e.preventDefault();
    navigate(target.href, true);
});

window.addEventListener("popstate", () => navigate(location.href, false));

async function navigate(href, push) {
    let html;
    try {
        const response = await fetch(href, { credentials: "same-origin" });
        if (!response.ok) throw new Error(response.status);
        html = await response.text();
    } catch (err) {
        location.href = href;  // give up quietly and let the browser navigate
        return;
    }

    // Push first: the incoming markup uses relative paths (../media/...) that
    // resolve against the document URL at the moment the browser reads them.
    if (push) history.pushState(null, "", href);
    render(new DOMParser().parseFromString(html, "text/html"));
}

function render(doc) {
    document.title = doc.title;

    const incoming = doc.body;

    // Scripts parsed by DOMParser are inert once adopted into a live document,
    // so drop them instead of leaving dead nodes behind; setupPage() covers
    // the work they used to do.
    incoming.querySelectorAll("script").forEach(node => node.remove());

    // Keep the canvas that is already on the page: the cursor is drawn into a
    // 2d context captured at load, and swapping in a fresh <canvas> element
    // would leave that context pointing at a detached node.
    incoming.querySelectorAll("canvas").forEach(node => node.remove());

    document.body.className = incoming.className;
    document.body.replaceChildren(canvas, ...incoming.childNodes);

    const column = document.querySelector(".right-content");
    if (column) column.scrollTop = 0;
    window.scrollTo(0, 0);

    setupPage();
}

setupPage();
