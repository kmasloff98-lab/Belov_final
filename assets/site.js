/*!
 * belov.tv — единый клиентский скрипт сайта
 * Заменяет удалённые при восстановлении скрипты WordPress / jQuery / Isotope / PhotoSwipe.
 * Без зависимостей, ES2015+.
 *
 *  1. Активный пункт меню (подсветка текущего раздела)
 *  2. Мобильное меню (бургер)
 *  3. Пагинация галерей (переключатель страниц / вкладок)
 *  4. Лайтбокс (просмотр фото на весь экран)
 *  5. Кнопка «Наверх»
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------
   * 1. АКТИВНЫЙ ПУНКТ МЕНЮ
   * ------------------------------------------------------------- */
  function normalizePath(p) {
    p = (p || '/').split('#')[0].split('?')[0];
    p = p.replace(/index\.html?$/i, '');
    if (p.charAt(p.length - 1) !== '/') p += '/';
    return p.replace(/\/{2,}/g, '/');
  }

  function initActiveMenu() {
    var current = normalizePath(window.location.pathname);
    $$('.aux-master-menu > li').forEach(function (li) {
      var a = $('a', li);
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (/^(tel:|mailto:|https?:)/i.test(href)) {
        li.classList.remove('current-menu-item', 'current_page_item', 'is-active');
        return;
      }
      var target = normalizePath(new URL(href, window.location.href).pathname);
      var active = target === current;
      li.classList.toggle('current-menu-item', active);
      li.classList.toggle('current_page_item', active);
      li.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------
   * 2. МОБИЛЬНОЕ МЕНЮ
   * ------------------------------------------------------------- */
  function initBurger() {
    var header = $('#site-elementor-header');
    var burger = $('.aux-burger-box', header);
    var nav = $('.menu-header-menu-container', header);
    if (!header || !burger || !nav) return;

    burger.setAttribute('role', 'button');
    burger.setAttribute('tabindex', '0');
    burger.setAttribute('aria-label', 'Открыть меню');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', nav.id || 'master-menu');

    function setOpen(open) {
      root.classList.toggle('sb-menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }

    burger.addEventListener('click', function () {
      setOpen(!root.classList.contains('sb-menu-open'));
    });
    burger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); burger.click(); }
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 767) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------
   * 3. ПАГИНАЦИЯ ГАЛЕРЕЙ
   * Каждая галерея обслуживается независимо — переключатель
   * управляет только «своими» фотографиями.
   * ------------------------------------------------------------- */
  function initGalleries() {
    $$('.aux-gallery').forEach(function (gallery) {
      var container = $('.aux-gallery-container', gallery);
      var nav = $('.aux-pagination', gallery);
      if (!container) return;

      // Сбрасываем позиционирование, оставшееся от Isotope
      container.removeAttribute('style');
      var items = $$('.aux-iso-item', container);
      items.forEach(function (it) { it.removeAttribute('style'); });

      var perPage = parseInt(container.getAttribute('data-perpage'), 10) || 6;
      var pages = Math.max(1, Math.ceil(items.length / perPage));
      var current = 1;

      // У галереи нет переключателя (потерян при выгрузке) — создаём его
      if (!nav) {
        if (pages < 2) {
          items.forEach(function (it) { it.classList.remove('aux-iso-hidden'); });
          return;
        }
        nav = doc.createElement('nav');
        nav.className = 'aux-pagination aux-round aux-page-no-border aux-iso-pagination';
        nav.innerHTML = '<ul class="pagination"></ul>';
        container.parentNode.insertBefore(nav, container.nextSibling);
      }

      // Перестраиваем переключатель под реальное количество страниц
      var ul = $('ul', nav);
      var html = '<li class="prev"><a href="#" data-dir="-1" aria-label="Предыдущая страница"><span class="sb-chev sb-chev--prev"></span></a></li>';
      for (var i = 1; i <= pages; i++) {
        html += '<li class="page"><a href="#" data-page="' + i + '" aria-label="Страница ' + i + '">' + i + '</a></li>';
      }
      html += '<li class="next"><a href="#" data-dir="1" aria-label="Следующая страница"><span class="sb-chev sb-chev--next"></span></a></li>';
      ul.innerHTML = html;
      nav.setAttribute('aria-label', 'Страницы галереи');

      if (pages < 2) { nav.hidden = true; }

      function show(page, scroll) {
        current = Math.min(pages, Math.max(1, page));
        var start = (current - 1) * perPage;
        var end = start + perPage;
        items.forEach(function (it, idx) {
          var visible = idx >= start && idx < end;
          it.classList.toggle('aux-iso-hidden', !visible);
          it.classList.toggle('sb-appear', visible);
        });
        $$('li.page', ul).forEach(function (li) {
          var on = parseInt($('a', li).getAttribute('data-page'), 10) === current;
          li.classList.toggle('active', on);
          $('a', li).setAttribute('aria-current', on ? 'page' : 'false');
        });
        $('li.prev', ul).classList.toggle('disabled', current === 1);
        $('li.next', ul).classList.toggle('disabled', current === pages);

        if (scroll) {
          var top = gallery.getBoundingClientRect().top + window.pageYOffset - 100;
          if (gallery.getBoundingClientRect().top < 0) window.scrollTo({ top: top, behavior: 'smooth' });
        }
      }

      ul.addEventListener('click', function (e) {
        var a = e.target.closest('a');
        if (!a) return;
        e.preventDefault();
        if (a.hasAttribute('data-page')) show(parseInt(a.getAttribute('data-page'), 10), true);
        else show(current + parseInt(a.getAttribute('data-dir'), 10), true);
      });

      gallery._sbShowPage = show;
      show(1, false);
    });
  }

  /* ---------------------------------------------------------------
   * 4. ЛАЙТБОКС
   * ------------------------------------------------------------- */
  function initLightbox() {
    var galleries = $$('.aux-lightbox-gallery');
    if (!galleries.length) return;

    var box = doc.createElement('div');
    box.className = 'sb-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Просмотр фотографии');
    box.hidden = true;
    box.innerHTML =
      '<button type="button" class="sb-lb-close" aria-label="Закрыть">&times;</button>' +
      '<button type="button" class="sb-lb-prev" aria-label="Предыдущее фото">&#8249;</button>' +
      '<figure class="sb-lb-stage"><img alt=""><span class="sb-lb-loader"></span></figure>' +
      '<button type="button" class="sb-lb-next" aria-label="Следующее фото">&#8250;</button>' +
      '<div class="sb-lb-counter"></div>';
    doc.body.appendChild(box);

    var img = $('img', box);
    var counter = $('.sb-lb-counter', box);
    var list = [];
    var index = 0;
    var lastFocus = null;
    var touchX = null;

    function render() {
      var link = list[index];
      var thumb = $('img', link);
      box.classList.add('is-loading');
      img.onload = function () { box.classList.remove('is-loading'); };
      img.onerror = function () {
        // Если полноразмерный файл недоступен — показываем то, что уже загружено на странице
        if (thumb && img.src !== thumb.currentSrc && thumb.currentSrc) img.src = thumb.currentSrc || thumb.src;
        box.classList.remove('is-loading');
      };
      img.src = link.getAttribute('href');
      img.alt = (thumb && thumb.alt) || '';
      counter.textContent = (index + 1) + ' / ' + list.length;
      var many = list.length > 1;
      $('.sb-lb-prev', box).hidden = !many;
      $('.sb-lb-next', box).hidden = !many;

      // Предзагрузка соседних кадров
      [index + 1, index - 1].forEach(function (n) {
        var l = list[(n + list.length) % list.length];
        if (l) { var p = new Image(); p.src = l.getAttribute('href'); }
      });
    }

    function open(links, i) {
      list = links; index = i; lastFocus = doc.activeElement;
      box.hidden = false;
      root.classList.add('sb-lb-open');
      render();
      $('.sb-lb-close', box).focus();
    }
    function close() {
      box.hidden = true;
      root.classList.remove('sb-lb-open');
      img.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    }
    function step(d) { index = (index + d + list.length) % list.length; render(); }

    galleries.forEach(function (gallery) {
      gallery.addEventListener('click', function (e) {
        var a = e.target.closest('a.aux-lightbox-btn');
        if (!a || !gallery.contains(a)) return;
        e.preventDefault();
        var links = $$('a.aux-lightbox-btn', gallery);
        open(links, links.indexOf(a));
      });
    });

    $('.sb-lb-close', box).addEventListener('click', close);
    $('.sb-lb-prev', box).addEventListener('click', function () { step(-1); });
    $('.sb-lb-next', box).addEventListener('click', function () { step(1); });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('sb-lb-stage')) close();
    });
    doc.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
    box.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      touchX = null;
    });
  }

  /* ---------------------------------------------------------------
   * 5. КНОПКА «НАВЕРХ»
   * ------------------------------------------------------------- */
  function initGotoTop() {
    var btn = $('.aux-goto-top-btn');
    if (!btn) return;
    btn.removeAttribute('style');
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', 'Наверх');
    function toggle() { btn.classList.toggle('is-visible', window.pageYOffset > 600); }
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
  }

  function init() {
    initActiveMenu();
    initBurger();
    initGalleries();
    initLightbox();
    initGotoTop();
    root.classList.add('sb-ready');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
