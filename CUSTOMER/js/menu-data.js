/* Menu items for the pop-up, cart pictures and the secret menu.
   They are NOT typed here any more: they come from the shared menu list (../shared/catalog.js),
   which the staff change on the employee side (Menu Items and Hidden Menu pages).
   To change the starting items, edit the list inside shared/catalog.js. */
const MENU_ITEMS = Catalog.menu();
const SECRET_ITEMS = Catalog.secret().filter(function (item) { return item.available !== false; });
