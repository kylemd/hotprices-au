const { downloadJSON, dom } = require("../js/misc");
const { View } = require("./view");
const { __ } = require("../browser_i18n");

class CartsList extends View {
    constructor() {
        super();
        this.innerHTML = /*html*/ `
            <div class="flex flex-col md:flex-row gap-4 px-4 py-2 my-4 justify-between items-center text-sm border rounded-xl md:mt-8 md:rounded-b-none md:mb-0 bg-gray-100">
                <div class="flex flex-col md:flex-row gap-2 items-center">
                    <label>
                        <input x-id="showDiscountsOnly" x-change x-state type="checkbox"> ${__("CartsList_Nur mit Rabatten")}
                    </label>
                    <label>
                        ${__("CartsList_Min. Rabatt")} <input x-id="minDiscount" x-state x-input type="number" min="-100" max="100" value="-100" class="w-16 px-1 rounded">%
                    </label>
                </div>
                <label>
                    ${__("CartsList_Sortieren")}
                    <select x-id="sort" x-change x-state>
                        <option value="name">${__("CartsList_Name")}</option>
                        <option value="products-asc">${__("CartsList_Produkte aufsteigend")}</option>
                        <option value="products-desc">${__("CartsList_Produkte absteigend")}</option>
                        <option value="price-asc">${__("CartsList_Preis aufsteigend")}</option>
                        <option value="price-desc">${__("CartsList_Preis absteigend")}</option>
                        <option value="discount-asc">${__("CartsList_Rabatt aufsteigend")}</option>
                        <option value="discount-desc">${__("CartsList_Rabatt absteigend")}</option>
                    </select>
                </label>
            </div>
            <table class="w-full">
                <thead>
                    <tr class="bg-primary text-left hidden md:table-row uppercase text-sm text-white">
                        <th class="px-2">${__("CartsList_Name")}</th>
                        <th class="px-2">${__("CartsList_Produkte")}</th>
                        <th class="px-2">${__("CartsList_Preis")}</th>
                        <th class="px-2"></th>
                    </tr>
                </thead>
                <tbody x-id="tableBody">
                </tbody>
            </table>
        `;

        this._cartTemplate = dom(
            "tr",
            /*html*/ `
            <td class="px-2 col-span-3">
                <a x-id="name" class="hover:underline"></a>
            </td>
            <td class="px-2">
                <span class="md:hidden text-sm">${__("CartsList_Produkte")}: </span>
                <span x-id="numProducts"></span>
            </td>
            <td class="px-2 col-span-2">
                <span class="md:hidden text-sm">${__("CartsList_Preisänderungen")}: </span>
                <span x-id="price"></span>
            </td>
            <td class="px-2 col-span-3">
                <div class="flex gap-4">
                    <a x-id="share" class="text-primary hover:underline text-sm font-medium">${__("CartsList_Teilen")}</a>
                    <a x-id="json" class="text-primary hover:underline text-sm font-medium" href="">${__("CartsList_JSON")}</a>
                    <input x-id="delete" class="ml-auto text-red-500 hover:underline text-sm font-medium" type="button" value="${__(
                        "CartsList_Löschen"
                    )}">
                </div>
            </td>
        `
        );
        this._cartTemplate.setAttribute("class", "grid grid-cols-3 hover:bg-gray-100 border border-gray-200 rounded-md p-2 md:table-row");
        
        this.setupEventHandlers();
        
        this.addEventListener("x-change", () => {
            this.render();
        });
    }

    sortAndFilterCarts(carts) {
        const elements = this.elements;
        const sortType = elements.sort.value;
        const showDiscountsOnly = elements.showDiscountsOnly.checked;
        const minDiscount = parseInt(elements.minDiscount.value, 10);
        
        // First, filter carts
        let filteredCarts = carts.slice(); // Create copy
        
        if (showDiscountsOnly || minDiscount > -100) {
            filteredCarts = filteredCarts.filter(cart => {
                if (cart.items.length === 0) return false;
                
                let oldPrice = 0;
                let currPrice = 0;
                for (const item of cart.items) {
                    oldPrice += item.priceHistory[item.priceHistory.length - 1].price;
                    currPrice += item.priceHistory[0].price;
                }
                const discountPercent = oldPrice != 0 ? Math.round(((currPrice - oldPrice) / oldPrice) * 100) : 0;
                
                if (showDiscountsOnly && discountPercent >= 0) return false; // Only show discounts (negative values)
                if (discountPercent < minDiscount) return false;
                
                return true;
            });
        }
        
        // Then, sort carts
        if (sortType === "name") {
            filteredCarts.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortType === "products-asc") {
            filteredCarts.sort((a, b) => a.items.length - b.items.length);
        } else if (sortType === "products-desc") {
            filteredCarts.sort((a, b) => b.items.length - a.items.length);
        } else if (sortType === "price-asc" || sortType === "price-desc") {
            filteredCarts.sort((a, b) => {
                const aCurrPrice = a.items.reduce((sum, item) => sum + item.priceHistory[0].price, 0);
                const bCurrPrice = b.items.reduce((sum, item) => sum + item.priceHistory[0].price, 0);
                return sortType === "price-asc" ? aCurrPrice - bCurrPrice : bCurrPrice - aCurrPrice;
            });
        } else if (sortType === "discount-asc" || sortType === "discount-desc") {
            filteredCarts.sort((a, b) => {
                const calculateDiscount = (cart) => {
                    if (cart.items.length === 0) return 0;
                    let oldPrice = 0;
                    let currPrice = 0;
                    for (const item of cart.items) {
                        oldPrice += item.priceHistory[item.priceHistory.length - 1].price;
                        currPrice += item.priceHistory[0].price;
                    }
                    return oldPrice != 0 ? Math.round(((currPrice - oldPrice) / oldPrice) * 100) : 0;
                };
                
                const aDiscount = calculateDiscount(a);
                const bDiscount = calculateDiscount(b);
                return sortType === "discount-asc" ? aDiscount - bDiscount : bDiscount - aDiscount;
            });
        }
        
        return filteredCarts;
    }

    render() {
        const model = this._model;
        const tableBody = this.elements.tableBody;
        tableBody.innerHTML = "";
        
        if (!model || !model.carts) return;

        const filteredAndSortedCarts = this.sortAndFilterCarts(model.carts);

        for (const cart of filteredAndSortedCarts) {
            let oldPrice = 0;
            let currPrice = 0;
            let shareLink = "cart.html?cart=" + encodeURIComponent(cart.name) + ";";
            for (const item of cart.items) {
                oldPrice += item.priceHistory[item.priceHistory.length - 1].price;
                currPrice += item.priceHistory[0].price;
                shareLink += item.store + item.id + ";";
            }
            const increase = oldPrice != 0 ? Math.round(((currPrice - oldPrice) / oldPrice) * 100) : 0;
            const cartUrl = `cart.html?name=${encodeURIComponent(cart.name)}`;

            const cartListItem = this._cartTemplate.cloneNode(true);
            const elements = View.elements(cartListItem);
            elements.name.href = cartUrl;
            elements.name.innerText = cart.name;
            elements.numProducts.innerText = cart.items.length;
            elements.price.innerText = `${currPrice.toFixed(2)} ${(increase > 0 ? "+" : "") + increase + "%"}`;
            elements.price.style.color = currPrice > oldPrice ? "red" : "green";
            elements.share.href = shareLink;
            elements.json.addEventListener("click", (event) => {
                event.preventDefault();
                downloadJSON(cart.name + ".json", cart);
            });
            if (cart.name === "Momentum Eigenmarken Vergleich") {
                elements.delete.classList.add("hidden");
            } else {
                elements.delete.addEventListener("click", () => model.remove(cart.name));
            }
            tableBody.append(cartListItem);
        }
    }
}

customElements.define("carts-list", CartsList);
