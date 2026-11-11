const currentPage = document.body.dataset.page;

if (currentPage === "login") {
    loginPage();
} else if (currentPage === "orders") {
    ordersPage();
} else if (currentPage === "qr-generator") {
    qrGeneratorPage();
} else if (currentPage === "menu-items") {
    menuItemsPage();
} else if (currentPage === "hidden-menu-items") {
    hiddenMenuItemsPage();
} else if (currentPage === "sales-report") {
    salesReportPage();
} else if (currentPage === "best-sellers") {
    bestSellersPage();}

function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");}

function loginPage() {
    const loginForm = document.getElementById("loginForm");
    const forgotButton = document.getElementById("forgot");

    forgotButton.onclick = function () {
        alert("Please contact your manager to reset your password.");};

    loginForm.onsubmit = function (event) {
        event.preventDefault();

        const username = document.getElementById("user").value.trim();
        const password = document.getElementById("pass").value;
        const error = document.getElementById("err");

        if (username === "" || password === "") {
            error.textContent = "Please enter your username and password.";
            return;}
        window.location.href = "orders.html";};
}

/* ---------------------------------------------------------
   Orders page (live)
   Reads the orders customers place on the customer website
   (shared browser storage key "cafe_orders"), lets the staff
   move them along, and confirms "Received". Confirming
   Received is what gives the customer their beans.
   Demo note: both sides must be opened from the same address
   (for example VS Code Live Server started in the SHAFRA folder).
   --------------------------------------------------------- */
function ordersPage() {
    const ORDERS_KEY = "cafe_orders";
    const USERS_KEY = "cafe_users";
    const body = document.getElementById("ordersBody");
    const empty = document.getElementById("ordersEmpty");
    const filterButtons = document.querySelectorAll(".pills button");
    let filter = "All";

    function load(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (error) {
            return [];}
    }

    function typeOf(order) {
        return order.type === "reward" ? "Reward" : order.option;}

    function tagClass(type) {
        if (type === "Pick up") return "Pickup";
        if (type === "Dine in") return "DineIn";
        if (type === "Front door delivery") return "Delivery";
        return "Reward";}

    function statusText(status, order) {
        const delivery = order && order.option === "Front door delivery";
        if (status === "Ready") return delivery ? "Out for Delivery" : "Ready for Pick-up";
        if (status === "Received") return delivery ? "Delivered" : "Completed";
        if (status === "Cancelled") return "Dropped";
        return status;}

    function itemsText(order) {
        const lines = order.items.map(function (line) {
            return line.qty + "x " + line.name + (line.size ? " (" + line.size + ")" : "");
        });
        let text = lines.join(", ");
        if (order.delivery) {
            text += " | Deliver to: " + order.delivery.address + " (" + order.delivery.phone + ")";
            if (order.delivery.note) text += " | Note: " + order.delivery.note;
        }
        return text;}

    function changeStatus(id, value) {
        const orders = load(ORDERS_KEY);
        const order = orders.find(function (o) { return o.id === id; });
        if (!order) return;

        if (value === "Received") {
            const beansText = order.type === "reward" ? "" : " The customer will receive +" + (order.beans || 0) + " beans.";
            if (!window.confirm("Confirm that order " + id + " was received by the customer?" + beansText)) {
                draw();
                return;}
            order.receivedAt = new Date().toISOString();
        }
        if (value === "Cancelled") {
            const warning = order.type === "reward"
                ? "The customer's beans will be refunded."
                : "The customer earns no beans and their order streak resets.";
            if (!window.confirm("Drop order " + id + "? " + warning)) {
                draw();
                return;}
            order.cancelledAt = new Date().toISOString();
        }
        order.status = value;
        order.history = (order.history || []).concat([{ status: value, at: new Date().toISOString() }]);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        draw();}

    function actionCell(order) {
        const cell = document.createElement("td");
        if (order.status === "Received" || order.status === "Cancelled") {
            cell.textContent = "Closed";
            return cell;}

        const select = document.createElement("select");
        select.className = "act";
        select.setAttribute("aria-label", "Update order " + order.id);
        const delivery = order.option === "Front door delivery";
        const choices = [
            ["Preparing", "Being prepared"],
            ["Ready", delivery ? "Out for delivery" : "Ready for pick-up"],
            ["Received", delivery ? "Mark as delivered" : "Mark as received"],
            ["Cancelled", "Mark as dropped"],];
        for (const choice of choices) {
            const option = document.createElement("option");
            option.value = choice[0];
            option.textContent = choice[1];
            if (choice[0] === order.status) option.selected = true;
            select.appendChild(option);}
        select.onchange = function () {
            changeStatus(order.id, select.value);};
        cell.appendChild(select);
        return cell;}

    function row(order, names) {
        const tr = document.createElement("tr");
        const type = typeOf(order);

        function cell(text) {
            const td = document.createElement("td");
            td.textContent = text;
            tr.appendChild(td);
            return td;}

        cell(order.id);
        cell(names[order.email] || order.email);
        cell(itemsText(order));

        const typeCell = document.createElement("td");
        const tag = document.createElement("span");
        tag.className = "tag " + tagClass(type);
        tag.textContent = type === "Pick up" ? "Pick-up" : type === "Dine in" ? "Dine-in" : type === "Front door delivery" ? "Delivery" : "Reward";
        typeCell.appendChild(tag);
        tr.appendChild(typeCell);

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = "status " + order.status;
        status.textContent = statusText(order.status, order);
        statusCell.appendChild(status);
        tr.appendChild(statusCell);

        tr.appendChild(actionCell(order));
        return tr;}

    function draw() {
        const orders = load(ORDERS_KEY).slice().sort(function (a, b) {
            return b.createdAt.localeCompare(a.createdAt);});
        const names = {};
        for (const user of load(USERS_KEY)) names[user.email] = user.name;

        const today = new Date().toDateString();
        let open = 0, ready = 0, todayCount = 0, sales = 0;
        for (const order of orders) {
            if (order.status === "Preparing") open++;
            if (order.status === "Ready") ready++;
            if (new Date(order.createdAt).toDateString() === today) {
                todayCount++;
                if (order.type !== "reward" && order.status !== "Cancelled") sales += order.total;}
        }
        document.getElementById("statOpen").textContent = open;
        document.getElementById("statReady").textContent = ready;
        document.getElementById("statToday").textContent = todayCount;
        document.getElementById("statSales").textContent = "\u20B1" + sales;

        body.textContent = "";
        let shown = 0;
        for (const order of orders) {
            if (filter !== "All" && typeOf(order) !== filter) continue;
            body.appendChild(row(order, names));
            shown++;}
        empty.hidden = shown > 0;}

    for (const button of filterButtons) {
        button.onclick = function () {
            for (const other of filterButtons) other.classList.remove("on");
            button.classList.add("on");
            filter = button.dataset.f;
            draw();};
    }

    // A new order from the customer side shows up without reloading
    window.addEventListener("storage", function (event) {
        if (event.key === ORDERS_KEY || event.key === null) draw();});

    draw();
}

function qrGeneratorPage() {
    const newStatus = {
        "Mark As Being Prepared": "Preparing",
        "Mark As Ready for Pick-up": "Ready for Pick-up",
        "Mark As Done": "Completed",
        "Mark As Dropped": "Dropped",};

    document.getElementById("processButton").onclick = function () {
        const status = newStatus[document.getElementById("action").value];
        document.getElementById("status").textContent = status;
        document.getElementById("message").textContent = "Order 4769 updated to " + status + ".";};
}

function salesReportPage() {
    const todayOrders = [
        { date: "Sept 5, 2026", id: 4769, type: "Grab", amount: 135, completed: true },
        { date: "Sept 5, 2026", id: 4770, type: "Pick-up", amount: 155, completed: true },
        { date: "Sept 5, 2026", id: 4771, type: "FoodPanda", amount: 115, completed: true },
        { date: "Sept 5, 2026", id: 4772, type: "Pick-up", amount: 135, completed: true },
        { date: "Sept 5, 2026", id: 4773, type: "FoodPanda", amount: 560, completed: false },];

    const earlierOrders = [
        { date: "Sept 4, 2026", id: 4765, type: "Grab", amount: 270, completed: true },
        { date: "Sept 4, 2026", id: 4766, type: "Pick-up", amount: 135, completed: true },
        { date: "Sept 3, 2026", id: 4762, type: "FoodPanda", amount: 210, completed: true },
        { date: "Sept 2, 2026", id: 4758, type: "Pick-up", amount: 150, completed: false },];

    const tableBody = document.getElementById("tableBody");
    const periodButtons = document.querySelectorAll(".tog");

    function showSales(period) {
        let orders = todayOrders;
        if (period === "week") {
            orders = todayOrders.concat(earlierOrders);}

        let sales_table = "";
        let revenue = 0;
        let dropped = 0;

        for (const order of orders) {
            let typeClass = order.type;
            if (order.type === "Pick-up") {
                typeClass = "Pickup";}

            let statusClass = "drop";
            let statusText = "Dropped";
            if (order.completed) {
                statusClass = "done";
                statusText = "Completed";
                revenue = revenue + order.amount;
            } else {
                dropped = dropped + 1; }

            sales_table += "<tr>";
            sales_table += "<td>" + order.date + "</td>";
            sales_table += "<td>" + order.id + "</td>";
            sales_table += "<td><span class='tag " + typeClass + "'>" + order.type + "</span></td>";
            sales_table += "<td>&#8369;" + order.amount + "</td>";
            sales_table += "<td><span class='st " + statusClass + "'>" + statusText + "</span></td>";
            sales_table += "</tr>";}

        tableBody.innerHTML = sales_table;
        document.getElementById("totalOrders").textContent = orders.length;
        document.getElementById("totalRevenue").innerHTML = "&#8369;" + revenue;
        document.getElementById("totalDropped").textContent = dropped;
    }

    function selectPeriod(clickedButton) {
        for (const button of periodButtons) {
            button.classList.remove("on"); }
        clickedButton.classList.add("on");
        showSales(clickedButton.dataset.r);
    }

    for (const button of periodButtons) {
        button.onclick = function () {
            selectPeriod(button);};
    }

    showSales("today");
}

function bestSellersPage() {
    const products = [
        { name: "Iced Latte", category: "Drinks", price: 135, today: 6, week: 20 },
        { name: "Butter Croissant", category: "Pastry", price: 150, today: 4, week: 14 },
        { name: "Spanish Latte", category: "Drinks", price: 135, today: 3, week: 14 },
        { name: "Ube Latte", category: "Drinks", price: 135, today: 5, week: 13 },
        { name: "Cookie Swirl", category: "Pastry", price: 150, today: 2, week: 11 } ];

    const tableBody = document.getElementById("tableBody");
    const timeButtons = document.querySelectorAll("[data-t]");
    const categoryButtons = document.querySelectorAll("[data-c]");

    let period = "week";
    let category = "All";

    function drawTable() {
        const filtered_products = [];
        for (const product of products) {
            if (category === "All" || product.category === category) {
                filtered_products.push(product); }
        }

        filtered_products.sort(function (a, b) {
            return b[period] - a[period];});

        let best_sellers_table = "";
        for (let i = 0; i < filtered_products.length; i++) {
            const product = filtered_products[i];
            const sold = product[period];
            best_sellers_table += "<tr>";
            best_sellers_table += "<td>" + (i + 1) + "</td>";
            best_sellers_table += "<td>" + product.name + "</td>";
            best_sellers_table += "<td><span class='cat " + product.category + "'>" + product.category + "</span></td>";
            best_sellers_table += "<td>" + sold + "</td>";
            best_sellers_table += "<td>&#8369;" + sold * product.price + "</td>";
            best_sellers_table += "</tr>"; }
        tableBody.innerHTML = best_sellers_table;
    }

    function highlight(buttons, clickedButton) {
        for (const button of buttons) {
            button.classList.remove("on");   }
        clickedButton.classList.add("on");
    }

    for (const button of timeButtons) {
        button.onclick = function () {
            period = button.dataset.t;
            highlight(timeButtons, button);
            drawTable();  };
    }

    for (const button of categoryButtons) {
        button.onclick = function () {
            category = button.dataset.c;
            highlight(categoryButtons, button);
            drawTable(); };
    }
    drawTable();
}
