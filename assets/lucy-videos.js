(function(){
  var languages={en:{src:'media/e4b-hero-en.mp4',poster:'assets/e4b-hero-en-poster.jpg',label:'Cô Lucy giới thiệu E4B bằng tiếng Anh, có phụ đề Việt'},vi:{src:'media/e4b-hero-vi-v2.mp4',poster:'assets/e4b-hero-vi-poster.jpg',label:'Cô Lucy giới thiệu E4B bằng tiếng Việt'}};
  function selectLanguage(button){
    var choice=languages[button.getAttribute('data-lucy-language')],video=document.getElementById('lucy-hero-video');
    if(!choice||!video)return;
    if(button.getAttribute('aria-selected')==='true'&&video.getAttribute('src')===choice.src){if(video.paused)video.play().catch(function(){});return;}
    video.pause();
    document.querySelectorAll('[data-lucy-language]').forEach(function(tab){var active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    video.preload='auto';video.setAttribute('poster',choice.poster);video.setAttribute('aria-label',choice.label);video.src=choice.src;video.load();var pr=video.play();if(pr&&pr.catch)pr.catch(function(){});
    document.getElementById('lucy-video-panel').setAttribute('aria-labelledby',button.id);
  }
  document.addEventListener('click',function(event){var t=event.target;if(t&&t.nodeType!==1)t=t.parentElement;var button=t&&t.closest('[data-lucy-language]');if(button){event.preventDefault();selectLanguage(button);}});
  document.addEventListener('keydown',function(event){
    var button=event.target.closest('[data-lucy-language]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();var buttons=Array.from(document.querySelectorAll('[data-lucy-language]')),index=buttons.indexOf(button);
    var next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();selectLanguage(buttons[next]);
  });
  document.addEventListener('play',function(event){if(event.target.tagName==='VIDEO')document.querySelectorAll('video').forEach(function(video){if(video!==event.target)video.pause();});},true);
})();
