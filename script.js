/**
 * Blog estático — GitHub Pages
 * ---------------------------
 * Este arquivo cuida de quatro coisas:
 *  1. persistir o tema claro/escuro no localStorage;
 *  2. montar a timeline a partir de posts Markdown;
 *  3. filtrar a timeline por tag;
 *  4. renderizar um post em post.html (Markdown → HTML → MathJax).
 *
 * Por que existe um posts.json?
 * O GitHub Pages é só arquivos estáticos. O navegador não consegue
 * listar o conteúdo da pasta /posts/ com fetch(). O índice em JSON é
 * a abordagem mais simples e confiável: cada post novo precisa de
 * duas ações — criar o .md e acrescentar o slug no array.
 * Os metadados (title, date, tags) continuam só no frontmatter do .md.
 */

(function () {
  "use strict";

  var THEME_KEY = "theme";
  var POSTS_INDEX = "posts.json";
  var POSTS_DIR = "posts/";

  /* ------------------------------------------------------------------ */
  /* Tema                                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Aplica o tema no <html> (data-theme) e no checkbox do cabeçalho.
   * O CSS já reage a html[data-theme="dark"] e a #theme-toggle:checked.
   */
  function applyTheme(theme) {
    var isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    var toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.checked = isDark;
  }

  function initTheme() {
    var saved = "light";
    try {
      saved = localStorage.getItem(THEME_KEY) || "light";
    } catch (err) {
      /* localStorage pode falhar em modo privado */
    }

    applyTheme(saved);

    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.addEventListener("change", function () {
      var next = toggle.checked ? "dark" : "light";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (err) {
        /* ignore */
      }
      applyTheme(next);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Frontmatter                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Aceita um bloco YAML mínimo no topo do arquivo:
   *
   * ---
   * title: Meu título
   * date: 2026-10-04
   * tags: [matematica, opiniao]
   * ---
   *
   * tags também pode ser uma lista separada por vírgula, sem colchetes.
   */
  function parseFrontmatter(raw) {
    var match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
      return { meta: { title: "", date: "", tags: [] }, body: raw };
    }

    var meta = { title: "", date: "", tags: [] };
    var lines = match[1].split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var colon = line.indexOf(":");
      if (colon === -1) continue;

      var key = line.slice(0, colon).trim().toLowerCase();
      var value = stripQuotes(line.slice(colon + 1).trim());

      if (key === "tags") {
        meta.tags = parseTags(value);
      } else {
        meta[key] = value;
      }
    }

    return { meta: meta, body: match[2] };
  }

  function stripQuotes(value) {
    return value.replace(/^["']|["']$/g, "");
  }

  function parseTags(value) {
    return value
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map(function (tag) {
        return normalizeTag(tag);
      })
      .filter(Boolean);
  }

  /** Remove #, espaços e deixa em minúsculas para comparar tags. */
  function normalizeTag(tag) {
    return String(tag)
      .trim()
      .replace(/^#/, "")
      .toLowerCase();
  }

  /**
   * Só aceita slugs do tipo "meu-post-1". Evita path traversal
   * (../) caso alguém mexa na query string.
   */
  function isSafeSlug(slug) {
    return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ------------------------------------------------------------------ */
  /* Carregamento dos posts                                              */
  /* ------------------------------------------------------------------ */

  async function fetchText(url) {
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error("Falha ao carregar " + url + " (" + response.status + ")");
    }
    return response.text();
  }

  async function fetchJson(url) {
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error("Falha ao carregar " + url + " (" + response.status + ")");
    }
    return response.json();
  }

  /**
   * Lê posts.json (array de slugs) e, em paralelo, cada arquivo .md.
   * Metadados vêm do frontmatter — o JSON só lista os arquivos.
   */
  async function loadAllPosts() {
    var slugs = await fetchJson(POSTS_INDEX);
    if (!Array.isArray(slugs)) {
      throw new Error("posts.json deve ser um array de slugs.");
    }

    var jobs = slugs.filter(isSafeSlug).map(async function (slug) {
      var raw = await fetchText(POSTS_DIR + slug + ".md");
      var parsed = parseFrontmatter(raw);
      return {
        slug: slug,
        title: parsed.meta.title || slug,
        date: parsed.meta.date || "",
        tags: parsed.meta.tags || [],
        body: parsed.body
      };
    });

    var posts = await Promise.all(jobs);

    posts.sort(function (a, b) {
      if (a.date === b.date) return 0;
      return a.date < b.date ? 1 : -1;
    });

    return posts;
  }

  /* ------------------------------------------------------------------ */
  /* Timeline (index.html)                                               */
  /* ------------------------------------------------------------------ */

  function initTimeline() {
    var list = document.querySelector(".post-log");
    if (!list) return;

    list.innerHTML =
      '<li class="is-empty"><p class="log-status">Carregando posts…</p></li>';

    loadAllPosts()
      .then(function (posts) {
        renderFilters(posts);
        renderTimeline(list, posts);
        bindFilters(list);
        applyFilterFromUrl(list);
      })
      .catch(function (err) {
        list.innerHTML =
          '<li class="is-empty"><p class="log-status">Não foi possível carregar os posts. Sirva o site por HTTP (não abra o HTML como arquivo) e confira o posts.json.</p></li>';
        console.error(err);
      });
  }

  function renderTimeline(list, posts) {
    if (!posts.length) {
      list.innerHTML =
        '<li class="is-empty"><p class="log-status">Nenhum post ainda.</p></li>';
      return;
    }

    list.innerHTML = posts
      .map(function (post) {
        var tagsAttr = post.tags.join(",");
        var tagsHtml = post.tags
          .map(function (tag) {
            return (
              '<button type="button" class="tag" data-tag="' +
              escapeHtml(tag) +
              '">#' +
              escapeHtml(tag) +
              "</button>"
            );
          })
          .join("");

        return (
          "<li data-tags=\"" +
          escapeHtml(tagsAttr) +
          "\">" +
          '<article class="post-row">' +
          '<time datetime="' +
          escapeHtml(post.date) +
          '" class="post-date">' +
          escapeHtml(post.date) +
          "</time>" +
          '<div class="post-body">' +
          '  <h3 class="post-title">' +
          '    <a href="post.html?slug=' +
          encodeURIComponent(post.slug) +
          '">' +
          escapeHtml(post.title) +
          "</a>" +
          "  </h3>" +
          '  <p class="post-tags">' +
          tagsHtml +
          "</p>" +
          "</div>" +
          "</article>" +
          "</li>"
        );
      })
      .join("");
  }

  /**
   * Recria os botões de filtro a partir das tags que realmente
   * aparecem nos posts, para não manter uma lista morta no HTML.
   */
  function renderFilters(posts) {
    var group = document.querySelector(".tag-list");
    if (!group) return;

    var unique = [];
    posts.forEach(function (post) {
      post.tags.forEach(function (tag) {
        if (unique.indexOf(tag) === -1) unique.push(tag);
      });
    });
    unique.sort();

    var html =
      '<button type="button" class="tag is-active" data-tag="todos">todos</button>';
    unique.forEach(function (tag) {
      html +=
        '<button type="button" class="tag" data-tag="' +
        escapeHtml(tag) +
        '">#' +
        escapeHtml(tag) +
        "</button>";
    });
    group.innerHTML = html;
  }

  function bindFilters(list) {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-tag]");
      if (!button) return;
      event.preventDefault();
      filterTimeline(list, button.getAttribute("data-tag"));
    });
  }

  function filterTimeline(list, tag) {
    var selected = normalizeTag(tag) || "todos";
    var items = list.querySelectorAll("li[data-tags]");
    var visible = 0;

    items.forEach(function (item) {
      var tags = (item.getAttribute("data-tags") || "")
        .split(",")
        .map(normalizeTag)
        .filter(Boolean);
      var show = selected === "todos" || tags.indexOf(selected) !== -1;
      item.hidden = !show;
      if (show) visible += 1;
    });

    document.querySelectorAll(".tag-list .tag").forEach(function (btn) {
      var isActive = normalizeTag(btn.getAttribute("data-tag")) === selected;
      btn.classList.toggle("is-active", isActive);
    });

    var empty = list.querySelector(".filter-empty");
    if (visible === 0) {
      if (!empty) {
        empty = document.createElement("li");
        empty.className = "is-empty filter-empty";
        empty.innerHTML =
          '<p class="log-status">Nenhum post com essa tag.</p>';
        list.appendChild(empty);
      }
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  function applyFilterFromUrl(list) {
    var params = new URLSearchParams(window.location.search);
    var tag = params.get("tag");
    if (tag) filterTimeline(list, tag);
  }

  /* ------------------------------------------------------------------ */
  /* Página do post (post.html)                                          */
  /* ------------------------------------------------------------------ */

  /**
   * O marked.js trata `_` como itálico. Em LaTeX, `_` é subscrito
   * (x_i). Por isso extraímos a matemática *antes* de parsear o
   * Markdown e devolvemos os delimitadores $ / $$ depois.
   * O MathJax só entra no final, quando o HTML já está no DOM.
   */
  function protectMath(markdown) {
    var slots = [];
    var parts = markdown.split(/(```[\s\S]*?```|`[^`\n]+`)/);

    var protectedText = parts
      .map(function (part, index) {
        if (index % 2 === 1) return part;

        part = part.replace(/\$\$([\s\S]+?)\$\$/g, function (_, tex) {
          var token = "@@MATH" + slots.length + "@@";
          slots.push({ display: true, tex: tex.trim() });
          return token;
        });

        part = part.replace(/\$([^$\n]+?)\$/g, function (_, tex) {
          var token = "@@MATH" + slots.length + "@@";
          slots.push({ display: false, tex: tex.trim() });
          return token;
        });

        return part;
      })
      .join("");

    return { text: protectedText, slots: slots };
  }

  function restoreMath(html, slots) {
    html = html.replace(/<p>\s*@@MATH(\d+)@@\s*<\/p>/g, function (_, index) {
      return mathToHtml(slots[Number(index)], true);
    });
    return html.replace(/@@MATH(\d+)@@/g, function (_, index) {
      return mathToHtml(slots[Number(index)], false);
    });
  }

  function mathToHtml(slot, wrappedInParagraph) {
    if (!slot) return "";
    if (slot.display) {
      return '<div class="math-display">$$' + slot.tex + "$$</div>";
    }
    if (wrappedInParagraph) {
      return "<p>$" + slot.tex + "$</p>";
    }
    return "$" + slot.tex + "$";
  }

  function markdownToHtml(markdown) {
    var protectedMath = protectMath(markdown);
    var parsed = window.marked.parse(protectedMath.text);
    return restoreMath(parsed, protectedMath.slots);
  }

  /**
   * typeset: false na config do post.html impede o MathJax de
   * processar a página vazia. Aqui, depois do marked, pedimos
   * explicitamente para tipografar só o artigo.
   */
  function typesetMath(element) {
    if (!window.MathJax || typeof window.MathJax.typesetPromise !== "function") {
      return Promise.resolve();
    }
    try {
      if (typeof window.MathJax.typesetClear === "function") {
        window.MathJax.typesetClear([element]);
      }
    } catch (err) {
      /* primeira renderização: ainda não há nada para limpar */
    }
    return window.MathJax.typesetPromise([element]);
  }

  function waitFor(predicate, timeout, label) {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function poll() {
        if (predicate()) {
          resolve();
          return;
        }
        if (Date.now() - started > timeout) {
          reject(new Error(label + " não carregou."));
          return;
        }
        setTimeout(poll, 40);
      })();
    });
  }

  function waitForMarked() {
    return waitFor(
      function () {
        return window.marked && typeof window.marked.parse === "function";
      },
      8000,
      "marked.js"
    );
  }

  function waitForMathJax() {
    return waitFor(
      function () {
        return window.MathJax && typeof window.MathJax.typesetPromise === "function";
      },
      8000,
      "MathJax"
    ).catch(function () {
      /* o post ainda renderiza; só fica sem equações */
    });
  }

  function initPost() {
    var article = document.querySelector(".article");
    if (!article) return;

    var titleEl = article.querySelector(".article-title");
    var dateEl = article.querySelector(".post-date");
    var tagsEl = article.querySelector(".post-tags");
    var bodyEl = article.querySelector(".article-body");

    var slug = new URLSearchParams(window.location.search).get("slug") || "";

    if (!isSafeSlug(slug)) {
      titleEl.textContent = "Post não encontrado";
      bodyEl.innerHTML =
        "<p>O endereço do post é inválido. Volte para a <a href=\"index.html\">timeline</a>.</p>";
      return;
    }

    titleEl.textContent = "Carregando…";

    Promise.all([waitForMarked(), waitForMathJax(), fetchText(POSTS_DIR + slug + ".md")])
      .then(function (results) {
        var raw = results[2];
        var parsed = parseFrontmatter(raw);
        var title = parsed.meta.title || slug;
        var date = parsed.meta.date || "";
        var tags = parsed.meta.tags || [];

        document.title = title + " — Jean";
        titleEl.textContent = title;
        dateEl.textContent = date;
        dateEl.setAttribute("datetime", date);

        tagsEl.innerHTML = tags
          .map(function (tag) {
            return (
              '<a class="tag" href="index.html?tag=' +
              encodeURIComponent(tag) +
              '">#' +
              escapeHtml(tag) +
              "</a>"
            );
          })
          .join("");

        bodyEl.innerHTML = markdownToHtml(parsed.body);
        return typesetMath(bodyEl);
      })
      .catch(function (err) {
        titleEl.textContent = "Post não encontrado";
        bodyEl.innerHTML =
          "<p>Não achei <code>posts/" +
          escapeHtml(slug) +
          ".md</code>. Confira o slug e o posts.json.</p>";
        console.error(err);
      });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  initTheme();
  initTimeline();
  initPost();
})();
