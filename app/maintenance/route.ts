const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>UPMANDEX is evolving</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        align-items: center;
        background: linear-gradient(160deg, #72bfff 0%, #bce7ff 48%, #f7fcff 100%);
        color: #183c61;
        display: flex;
        font-family: Arial, Helvetica, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        overflow: hidden;
        padding: clamp(1.5rem, 5vw, 5rem);
      }
      .sky { inset: 0; overflow: hidden; pointer-events: none; position: fixed; }
      .cloud {
        background: rgba(255, 255, 255, .76);
        border-radius: 999px;
        box-shadow: 3.5rem 0 0 -.3rem rgba(255, 255, 255, .88), 6.5rem .35rem 0 -.8rem rgba(236, 248, 255, .9), 1.8rem -1.2rem 0 -.65rem rgba(255, 255, 255, .8);
        height: 3.8rem;
        position: absolute;
        width: 8.5rem;
      }
      .one { animation: drift 18s ease-in-out infinite alternate; left: 8%; top: 16%; }
      .two { animation: drift 22s ease-in-out -7s infinite alternate-reverse; right: 15%; top: 24%; transform: scale(1.35); }
      .three { animation: drift 20s ease-in-out -4s infinite alternate; bottom: 13%; left: 17%; transform: scale(1.65); }
      .four { animation: drift 24s ease-in-out -11s infinite alternate-reverse; bottom: 19%; right: 10%; transform: scale(.85); }
      main {
        backdrop-filter: blur(6px);
        background: rgba(255, 255, 255, .82);
        border: 1px solid rgba(255, 255, 255, .95);
        border-radius: 2rem;
        box-shadow: 0 1.5rem 4rem rgba(38, 103, 156, .22);
        max-width: 44rem;
        padding: clamp(2rem, 6vw, 4.5rem);
        position: relative;
        text-align: center;
      }
      .eyebrow { color: #347eba; font-size: .78rem; font-weight: 800; letter-spacing: .16em; }
      h1 { color: #15588e; font-size: clamp(2rem, 6vw, 4.35rem); letter-spacing: -.05em; line-height: .98; margin: .75rem 0 1.75rem; }
      p { font-size: clamp(1rem, 2.3vw, 1.22rem); line-height: 1.58; margin: .75rem auto; max-width: 36rem; }
      .signoff { color: #286da8; font-weight: 800; margin-top: 1.5rem; }
      @keyframes drift { from { translate: -1rem 0; } to { translate: 2.4rem -.7rem; } }
      @media (prefers-reduced-motion: reduce) { .cloud { animation: none; } }
    </style>
  </head>
  <body>
    <div class="sky" aria-hidden="true"><span class="cloud one"></span><span class="cloud two"></span><span class="cloud three"></span><span class="cloud four"></span></div>
    <main>
      <span class="eyebrow">CLOUD WORLD</span>
      <h1>UPMANDEX IS EVOLVING!</h1>
      <p>Our little Cloud World is getting ready for something special.</p>
      <p>The UPMANDEX website is temporarily unavailable while we prepare its next chapter.</p>
      <p>Your Upmans and collections are safe.</p>
      <p class="signoff">See you in the clouds!</p>
    </main>
  </body>
</html>`;

function unavailable() {
  return new Response(page, {
    status: 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "3600",
    },
  });
}

export const GET = unavailable;
export const POST = unavailable;
export const PUT = unavailable;
export const PATCH = unavailable;
export const DELETE = unavailable;
export const HEAD = unavailable;
export const OPTIONS = unavailable;
