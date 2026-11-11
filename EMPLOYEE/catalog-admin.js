/* Menu Items + Hidden Menu Items pages (staff side).
   Both pages read and write the SAME catalog the customer site uses (../shared/catalog.js),
   so anything added, edited, hidden or removed here shows up on the customer menu. */

function menuItemsPage() { catalogAdmin("menu"); }
function hiddenMenuItemsPage() { catalogAdmin("secret"); }

function catalogAdmin(section) {
    const isSecret = section === "secret";
    const categories = isSecret ? Catalog.SECRET_CATEGORIES : Catalog.MENU_CATEGORIES;
    const priceField = isSecret ? "cost" : "price";
    const priceLabel = isSecret ? "Bean cost" : "Price (₱)";
    const $ = function (id) { return document.getElementById(id); };
    const categoryLabel = function (id) {
        const c = categories.filter(function (x) { return x.id === id; })[0];
        return c ? c.label : id;
    };

    let filter = "all";
    let query = "";
    let pendingImage = "";   // picture chosen in the add form
    let editingId = null;
    let editImage = null;    // picture chosen in the edit dialog (null = keep the old one)

    const form = {
        name: $("name"), category: $("category"), price: $("price"), beans: $("beans"),
        desc: $("desc"), image: $("image"), preview: $("preview"), msg: $("formMsg"), add: $("add")
    };

    /* ---------- fill the category dropdowns ---------- */
    function fillSelect(select) {
        select.innerHTML = "";
        categories.forEach(function (c) {
            const o = document.createElement("option");
            o.value = c.id;
            o.textContent = c.label;
            select.appendChild(o);
        });
    }
    fillSelect(form.category);
    fillSelect($("eCategory"));

    /* ---------- showing the items ---------- */
    function matches(item) {
        if (filter !== "all" && item.category !== filter) return false;
        const q = query.trim().toLowerCase();
        return !q || (item.name + " " + (item.desc || "")).toLowerCase().indexOf(q) !== -1;
    }

    function items() { return isSecret ? Catalog.secret() : Catalog.menu(); }

    function renderPills() {
        const all = items();
        const box = $("pills");
        box.innerHTML = "";
        [{ id: "all", label: "All" }].concat(categories).forEach(function (c) {
            const count = c.id === "all" ? all.length : all.filter(function (i) { return i.category === c.id; }).length;
            const b = document.createElement("button");
            b.type = "button";
            b.className = filter === c.id ? "on" : "";
            b.textContent = c.label + " (" + count + ")";
            b.onclick = function () { filter = c.id; render(); };
            box.appendChild(b);
        });
        $("total").textContent = all.length + (all.length === 1 ? " item" : " items") + " in total";
    }

    function priceText(item) {
        return isSecret ? item.cost + " beans" : "₱" + item.price;
    }

    function card(item) {
        const el = document.createElement("div");
        el.className = "mi" + (item.available === false ? " is-off" : "");
        const img = document.createElement("div");
        img.className = "img";
        const url = Catalog.imageUrl(item, "../CUSTOMER/");
        if (url) img.style.backgroundImage = 'url("' + url.replace(/"/g, "%22") + '")';
        el.appendChild(img);

        const h = document.createElement("h3");
        h.textContent = item.name;
        el.appendChild(h);

        const p = document.createElement("p");
        let line = priceText(item);
        if (!isSecret && item.beans) line += "  ·  +" + item.beans + " beans";
        p.textContent = line;
        el.appendChild(p);

        const tags = document.createElement("div");
        tags.className = "mi-tags";
        if (item.available === false) tags.appendChild(tag("Unavailable", "off"));
        if (item.bestSeller) tags.appendChild(tag("Best seller", "gold"));
        if (item.custom) tags.appendChild(tag("Added by staff", ""));
        if (tags.children.length) el.appendChild(tags);

        const b = document.createElement("div");
        b.className = "b";
        b.appendChild(button(item.available === false ? "Make available" : "Mark unavailable",
            "chip" + (item.available === false ? " off" : ""), function () {
                save(Catalog.update(item.id, { available: item.available === false }));
            }));
        if (!isSecret) {
            b.appendChild(button(item.bestSeller ? "★ Best seller" : "☆ Best seller", "chip", function () {
                save(Catalog.update(item.id, { bestSeller: !item.bestSeller }));
            }));
        }
        b.appendChild(button("Edit", "chip", function () { openEdit(item.id); }));
        b.appendChild(button("Remove", "chip danger", function () {
            if (confirm('Remove "' + item.name + '" from the ' + (isSecret ? "hidden menu" : "menu") +
                "? Customers will no longer see it.")) {
                save(Catalog.remove(item.id));
            }
        }));
        el.appendChild(b);
        return el;
    }

    function tag(text, cls) {
        const s = document.createElement("span");
        s.className = "mi-tag " + cls;
        s.textContent = text;
        return s;
    }

    function button(text, cls, fn) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = cls;
        b.textContent = text;
        b.onclick = fn;
        return b;
    }

    function save(ok) {
        if (!ok) alert("Could not save the change — the browser storage is full. Try smaller pictures or remove unused items.");
        render();
    }

    function render() {
        renderPills();
        const box = $("groups");
        box.innerHTML = "";
        const all = items();
        let shown = 0;
        categories.forEach(function (c) {
            if (filter !== "all" && filter !== c.id) return;
            const inCat = all.filter(function (i) { return i.category === c.id; });
            const list = inCat.filter(matches);
            if (!list.length) return;
            shown += list.length;
            const sec = document.createElement("section");
            sec.className = "cat-group";
            const h = document.createElement("h2");
            h.className = "cat-title";
            h.textContent = c.label;
            const n = document.createElement("span");
            n.textContent = list.length + (list.length === 1 ? " item" : " items");
            h.appendChild(n);
            sec.appendChild(h);
            const grid = document.createElement("div");
            grid.className = "grid";
            list.forEach(function (i) { grid.appendChild(card(i)); });
            sec.appendChild(grid);
            box.appendChild(sec);
        });
        $("empty").hidden = shown > 0;
    }

    $("search").oninput = function () { query = this.value; render(); };

    /* ---------- add form ---------- */
    function say(text, ok) {
        form.msg.textContent = text;
        form.msg.className = "form-msg " + (ok ? "ok" : "bad");
    }

    form.image.onchange = function () {
        const file = form.image.files[0];
        pendingImage = "";
        form.preview.hidden = true;
        if (!file) return;
        Catalog.resizeImage(file).then(function (data) {
            pendingImage = data;
            form.preview.src = data;
            form.preview.hidden = false;
            say("", true);
        }).catch(function (err) {
            form.image.value = "";
            say(err.message, false);
        });
    };

    form.add.onclick = function () {
        const name = form.name.value.trim();
        const price = Number(form[isSecret ? "price" : "price"].value);
        if (!name) { say("Please enter the item name.", false); form.name.focus(); return; }
        const dup = Catalog.all().some(function (i) {
            return i.section === section && i.name.toLowerCase() === name.toLowerCase();
        });
        if (dup) { say('There is already an item called "' + name + '".', false); form.name.focus(); return; }
        if (!form.price.value || !isFinite(price) || price <= 0) {
            say("Please enter a " + (isSecret ? "bean cost" : "price") + " greater than 0.", false);
            form.price.focus();
            return;
        }
        const fields = { name: name, category: form.category.value, desc: form.desc.value.trim(), image: pendingImage };
        if (isSecret) {
            fields.cost = Math.round(price);
        } else {
            fields.price = price;
            if (form.beans.value !== "") fields.beans = Math.max(0, Math.round(Number(form.beans.value)));
        }
        const item = Catalog.add(fields, section);
        if (!item) { say("Could not save — the browser storage is full. Try a smaller picture.", false); return; }
        say('"' + item.name + '" was added to ' + categoryLabel(item.category) + " and is now on the customer " +
            (isSecret ? "secret menu." : "menu."), true);
        form.name.value = form.price.value = form.desc.value = "";
        if (form.beans) form.beans.value = "";
        form.image.value = "";
        form.preview.hidden = true;
        pendingImage = "";
        filter = "all";
        query = "";
        $("search").value = "";
        render();
    };

    /* ---------- edit dialog ---------- */
    const dlg = $("editDialog");

    function openEdit(id) {
        const item = Catalog.get(id);
        if (!item) return;
        editingId = id;
        editImage = null;
        $("eName").value = item.name;
        $("eCategory").value = item.category;
        $("ePrice").value = isSecret ? item.cost : item.price;
        if ($("eBeans")) $("eBeans").value = item.beans || 0;
        $("eDesc").value = item.desc || "";
        $("eImage").value = "";
        const url = Catalog.imageUrl(item, "../CUSTOMER/");
        $("ePreview").src = url;
        $("ePreview").hidden = !url;
        $("eMsg").textContent = "";
        dlg.showModal();
    }

    $("eImage").onchange = function () {
        const file = this.files[0];
        if (!file) return;
        Catalog.resizeImage(file).then(function (data) {
            editImage = data;
            $("ePreview").src = data;
            $("ePreview").hidden = false;
        }).catch(function (err) { $("eMsg").textContent = err.message; });
    };

    $("eCancel").onclick = function () { dlg.close(); };

    $("eSave").onclick = function () {
        const name = $("eName").value.trim();
        const price = Number($("ePrice").value);
        if (!name) { $("eMsg").textContent = "The name can't be empty."; return; }
        if (!isFinite(price) || price <= 0) { $("eMsg").textContent = "Enter a number greater than 0."; return; }
        const dup = Catalog.all().some(function (i) {
            return i.id !== editingId && i.section === section && i.name.toLowerCase() === name.toLowerCase();
        });
        if (dup) { $("eMsg").textContent = 'There is already an item called "' + name + '".'; return; }
        const patch = { name: name, category: $("eCategory").value, desc: $("eDesc").value.trim() };
        if (isSecret) patch.cost = Math.round(price); else { patch.price = price; patch.beans = Math.max(0, Math.round(Number($("eBeans").value) || 0)); }
        if (editImage) patch.image = editImage;
        if (!Catalog.update(editingId, patch)) { $("eMsg").textContent = "Could not save — storage is full."; return; }
        dlg.close();
        render();
    };

    /* other tab (e.g. the customer site) changed the catalog */
    Catalog.onChange(render);
    render();
}
