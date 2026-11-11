/* =========================================================
   Shafra Cafe - menu-render.js  (menu page only)
   Draws the menu from the shared item list (Catalog), so an item the
   staff add on the employee side shows up here, in the right category.
   Must load before script.js (search/filter) and item-modal.js (pop-up),
   because they look for the rows this file creates.
   ========================================================= */

(function () {
  const offersBox = document.getElementById('offers');
  const restBox = document.getElementById('menuCategories');
  if (!offersBox || !restBox || typeof Catalog === 'undefined') return;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function tagClass(text) {
    const word = String(text).toLowerCase();
    if (word.indexOf('limited') === 0) return 'limited';
    if (word === 'new') return 'new';
    if (word.indexOf('nuts') !== -1) return 'nuts';
    if (word.indexOf('spicy') === 0) return 'spicy';
    if (word.indexOf('vegan') === 0) return 'vegan';
    return 'new';
  }

  function buildRow(item) {
    const soldOut = item.available === false;
    const row = el('div', 'menu-item' + (soldOut ? ' sold-out' : ''));
    row.dataset.category = item.category;
    row.dataset.id = item.id;
    if (!soldOut) {
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'View details for ' + item.name);
    }

    const img = el('img', 'item-thumb');
    img.src = item.image;
    img.alt = item.name;
    img.loading = 'lazy';
    img.width = 96;
    img.height = 96;
    row.appendChild(img);

    const body = el('div', 'item-body');

    const top = el('div', 'row');
    const title = el('h3', '', item.name + ' ');
    const tags = (item.tags || []).slice();
    if (item.bestSeller) tags.push('Best seller');
    if (soldOut) tags.length = 0;
    tags.forEach(function (text) { title.appendChild(el('span', 'tag ' + (text === 'Best seller' ? 'new' : tagClass(text)), text)); });
    if (soldOut) title.appendChild(el('span', 'tag sold', 'Sold out'));
    top.appendChild(title);
    top.appendChild(el('span', 'dots'));
    if (item.old) top.appendChild(el('span', 'old-price', Store.peso(item.old)));
    top.appendChild(el('span', 'price', Store.peso(item.price)));
    body.appendChild(top);

    body.appendChild(el('p', '', item.desc));

    const foot = el('div', 'item-foot');
    foot.appendChild(el('span', 'view-hint', soldOut ? 'Not available right now' : 'Tap for details & add to cart'));
    const badge = el('span', 'beans-badge');
    const icon = el('span', 'bean-icon');
    icon.setAttribute('aria-hidden', 'true');
    badge.append(icon, '+' + item.beans + ' beans');
    foot.appendChild(badge);
    body.appendChild(foot);

    row.appendChild(body);
    return row;
  }

  const items = Catalog.menu();

  /* ---------- offers: always the first section ---------- */
  const offers = items.filter(function (i) { return i.category === 'offers'; });
  offersBox.appendChild(el('span', 'badge', 'Limited time'));
  offersBox.appendChild(el('h2', '', 'Seasonal & limited offers'));
  const note = el('p', 'offer-note', 'Available until November 30 · ');
  const link = el('a', '', 'See all offers');
  link.href = 'offers.html';
  note.appendChild(link);
  offersBox.appendChild(note);
  const offerList = el('div', 'menu-list');
  offers.forEach(function (item) { offerList.appendChild(buildRow(item)); });
  offersBox.appendChild(offerList);
  if (offers.length === 0) offersBox.style.display = 'none';

  /* ---------- the other categories, in order ---------- */
  Catalog.MENU_CATEGORIES.filter(function (c) { return c.id !== 'offers'; }).forEach(function (cat) {
    const inCat = items.filter(function (i) { return i.category === cat.id; });
    if (inCat.length === 0) return;
    const box = el('div', 'menu-category');
    box.id = cat.id;
    box.appendChild(el('h2', '', cat.label));
    const list = el('div', 'menu-list');
    inCat.forEach(function (item) { list.appendChild(buildRow(item)); });
    box.appendChild(list);
    restBox.appendChild(box);
  });
})();
