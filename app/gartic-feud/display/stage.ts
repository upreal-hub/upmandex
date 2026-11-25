export const stageStyles = `
.ambience{position:fixed;inset:0;overflow:hidden;pointer-events:none}
.cloud{position:absolute;width:clamp(72px,12vw,230px);aspect-ratio:3.5;border-radius:100%;background:#9cd9ff26;filter:blur(7px);animation:cloud-drift 18s ease-in-out infinite alternate}
.cloud::before,.cloud::after{content:"";position:absolute;border-radius:100%;background:inherit}
.cloud::before{width:46%;height:125%;left:18%;bottom:12%}.cloud::after{width:38%;height:95%;right:15%;bottom:14%}
.cloud:nth-child(1){left:2%;top:12%}.cloud:nth-child(2){right:2%;bottom:10%;animation-delay:-8s}.cloud:nth-child(3){left:25%;bottom:3%;animation-delay:-14s}
.spark{position:absolute;color:#c9f2ff;opacity:.3;font-size:clamp(12px,1.5vw,30px);text-shadow:0 0 10px #73cdff;animation:twinkle 9s ease-in-out infinite}
.spark:nth-of-type(1){left:7%;top:22%}.spark:nth-of-type(2){left:19%;bottom:8%;animation-delay:-4s}.spark:nth-of-type(3){right:12%;top:18%;animation-delay:-2s}.spark:nth-of-type(4){right:4%;bottom:28%;animation-delay:-7s}.spark:nth-of-type(5){left:45%;top:5%;animation-delay:-5s}
@keyframes cloud-drift{to{transform:translate(40px,-11px)}}@keyframes twinkle{0%,100%{opacity:.08;transform:scale(.8)}45%{opacity:.5;transform:scale(1.13)}}
.player.active strong{color:#e2fbff;text-shadow:0 0 14px #3fa9ff}
.player.active .score{color:#d9f8ff;text-shadow:0 0 12px #60c6ff}
#board{isolation:isolate}
#board::before{content:"";position:absolute;inset:-5px;border:1px solid #96dbff38;border-radius:27px;pointer-events:none;z-index:-1}
#wheel{position:absolute;z-index:4;inset:0;display:grid;place-items:center;border-radius:21px;background:#061632d9;margin:0}
#wheel::before{content:none}
#wheel-frame{position:relative;display:grid;place-items:center}
#wheel-frame::before{content:"";position:absolute;top:-4px;left:50%;z-index:2;transform:translateX(-50%);border:12px solid transparent;border-top-color:white;filter:drop-shadow(0 1px 3px #061632)}
#disc{position:relative;display:block;width:min(45vh,54vw,330px);aspect-ratio:1;border:4px solid #d5f2ff;border-radius:50%;background:conic-gradient(from -45deg,#1967c2 25%,#103f87 0 50%,#176fb7 0 75%,#124a9c 0);box-shadow:0 0 23px #5eb9ff;text-shadow:0 0 4px #021331;animation:none}
#disc.spinning{animation:spin .85s linear infinite}
.wheel-label{position:absolute;display:grid;justify-items:center;align-content:center;width:34%;height:28%;transform:translate(-50%,-50%);text-align:center;font-size:clamp(8px,1.03vw,18px);line-height:1.05;overflow-wrap:anywhere}
.wheel-label strong{color:#a7e9ff}.wheel-label.long{font-size:clamp(7px,.84vw,15px)}
.wheel-label:nth-child(1){left:50%;top:21%}.wheel-label:nth-child(2){left:79%;top:50%}.wheel-label:nth-child(3){left:50%;top:79%}.wheel-label:nth-child(4){left:21%;top:50%}
#roulette-result{position:absolute;z-index:3;bottom:4%;padding:5px 15px;border-radius:100px;background:#082653;border:1px solid #a2dfff;color:white;text-align:center;max-width:94%;overflow-wrap:anywhere}
#show-card,#round-note{position:absolute;inset:0;z-index:5;display:grid;place-content:center;text-align:center;pointer-events:none;opacity:0;border-radius:20px}
#show-card{background:radial-gradient(ellipse,#359bff,#082253 76%);color:white;font-size:clamp(24px,5vw,95px);text-shadow:0 0 24px #e7f9ff;font-weight:950;letter-spacing:.025em}
#round-note{inset:auto 12% 3%;min-height:2.2em;border-radius:100px;background:#0f4996;border:1px solid #b2e6ff;font-size:.85em;z-index:4}
#burst{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;border-radius:20px}
#burst span{position:absolute;left:50%;top:49%;color:#dcf5ff;opacity:0;text-shadow:0 0 12px #91ddff}
#winners{font-size:clamp(20px,2.5vw,52px);color:#baeaff;text-align:center;text-shadow:0 0 22px #329aff;overflow-wrap:anywhere}
#rank li.first{border:1px solid #99dcff;background:linear-gradient(110deg,#1e69bd,#174a99)}
.tile.is-entering{animation:tile-enter .45s ease-out both;animation-delay:var(--delay)}
.tile.reveal-wave span:nth-child(2),.tile.reveal-wave strong{animation:answer-in .32s ease-out both;animation-delay:var(--delay)}
.tile{--delay:0ms}.tile:nth-child(2){--delay:48ms}.tile:nth-child(3){--delay:96ms}.tile:nth-child(4){--delay:144ms}.tile:nth-child(5){--delay:192ms}.tile:nth-child(6){--delay:240ms}.tile:nth-child(7){--delay:288ms}.tile:nth-child(8){--delay:336ms}
@keyframes tile-enter{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
@keyframes answer-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
html[data-motion="off"] *,html[data-motion="off"] *::before,html[data-motion="off"] *::after{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){.cloud,.spark,#disc.spinning,.tile.is-entering,.tile.reveal-wave span,.tile.reveal-wave strong{animation:none!important}}
`;

export const ambienceMarkup = '<div class="ambience" aria-hidden="true"><i class="cloud"></i><i class="cloud"></i><i class="cloud"></i><span class="spark">✦</span><span class="spark">✧</span><span class="spark">✦</span><span class="spark">✧</span><span class="spark">✦</span></div>';

export const stageMarkup = `<p id="winners" hidden></p><div id="show-card" aria-hidden="true">Gartic Feud</div>
<div id="round-note" aria-hidden="true">Question complete</div>
<div id="burst" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => '<span>' + (i % 2 ? '✦' : '✧') + '</span>').join("")}</div>`;
