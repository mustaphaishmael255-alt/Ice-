import { fetchProductsFromSupabase, fetchProductReviews } from "./supabase.js";
import flavors_list from "./flavor_database.js";
import products_list from "./product_database.js";

let cloud_products = [];

function getReviewCount(productId) {
    const reviews = JSON.parse(localStorage.getItem("Yah!_reviews")) || [];
    const productReviews = reviews.filter(r => r.productId === productId);
    return productReviews.length;
}

// Lazy loading images
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Lazy load elements on scroll
function setupLazyElements() {
    const lazyElements = document.querySelectorAll('.lazy-load');
    const elementObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    lazyElements.forEach(el => elementObserver.observe(el));
}

function initProducts() {
      // 1. Instant Synchronous Render: zero wait time for user!
      cloud_products = [...(products_list || [])];
      
      displayFlavorFilter();
      createSearchBar();
      createSortControls();

      const flavor_id = getQueryParam("flavor");
      const categoryParam = getQueryParam("category");

      if (flavor_id) {
            filterProducts(flavor_id, "flavor");
      } else if (categoryParam) {
            filterProducts(categoryParam, "category");
      } else {
            displayProducts(cloud_products);
      }

      // Dismiss preloader immediately so page is instantly accessible
      document.body.classList.add('loaded');

      // Setup lazy loading
      setupLazyLoading();
      setupLazyElements();

      // 2. Non-blocking background sync with Supabase (if available)
      syncSupabaseInBackground();
}

async function syncSupabaseInBackground() {
      try {
            const [supabaseProducts, supabaseReviews] = await Promise.all([
                  fetchProductsFromSupabase().catch(() => null),
                  fetchProductReviews().catch(() => null)
            ]);

            if (supabaseReviews && Array.isArray(supabaseReviews) && supabaseReviews.length > 0) {
                  const formattedReviews = supabaseReviews.map(r => ({
                        productId: r.product_id,
                        rating: r.rating,
                        email: r.user_email
                  }));
                  localStorage.setItem("Yah!_reviews", JSON.stringify(formattedReviews));
                  
                  // Update review counts in place without re-rendering everything
                  formattedReviews.forEach(r => {
                        const countEl = document.getElementById(`review-count-${r.productId}`);
                        if (countEl) countEl.textContent = `(${getReviewCount(r.productId)} reviews)`;
                  });
            }

            if (supabaseProducts && Array.isArray(supabaseProducts) && supabaseProducts.length > 0) {
                  cloud_products = supabaseProducts;
                  const activeCategory = document.querySelector(".categories-wrapper .active")?.id || "all";
                  filterProducts(activeCategory, "category");
            }
      } catch (e) {
            // Background sync error - silently ignore since local catalog is already rendered
      }
}

if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initProducts);
} else {
      initProducts();
}

function displayProducts(products) {
      const productsSection = document.querySelector(".products-box");
      if (!productsSection) return;
      
      productsSection.innerHTML = "";

      if (products.length === 0) {
            productsSection.innerHTML = `
              <div class="no-product-container">
                  <h1 class="no-product-heading">No Product Found</h1>
                  <img src="./images/product-not-found.png" alt="No products available" class="no-product-image">
                  <p class="no-product-text">We're sorry, but it seems we can't find the product you're looking for. Try searching for another flavor!</p>
              </div>
          `;
            return;
      }

      products.forEach((product) => {
            const flavorName = flavors_list.find((f) => f.id === product.flavor_id)?.name;
            const box = document.createElement("div");
            box.className = "box";
            box.id = product.id;

            box.innerHTML = `
              <div class="image-wrapper">
                  <div class="off">-${product.off}%</div>
                  ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                  <img src="${product.image}" alt="${product.name}">
                  <div class="cat-label">${product.category || flavorName || 'Original'}</div>
                  <div class="quick-view-icon">
                      <i class="fas fa-eye"></i>
                  </div>
                  <div class="wishlist-icon" data-id="${product.id}">
                      <i class="fas fa-heart"></i>
                  </div>
              </div>
              <div class="name-price">
                  <div class="name">${product.name}</div>
                  <div class="price">GHS ${parseFloat(product.price).toFixed(2)}</div>
              </div>
              <div class="stars" data-product-id="${product.id}">
                  ${Array.from({ length: 5 }, (_, i) => 
                      `<i class="${i < (product.rating || 4) ? 'fas' : 'far'} fa-star" data-rating="${i + 1}"></i>`
                  ).join('')}
                  <span class="review-count" id="review-count-${product.id}">(${getReviewCount(product.id)} reviews)</span>
              </div>
              <div class="description">${product.description}</div>
              <div class="qty">
                  <span class="decrease">-</span>
                  <span class="pcs">1</span>
                  <span class="increase">+</span>
              </div>`;

            // Quantity Control Logic
            const decreaseBtn = box.querySelector(".decrease");
            const increaseBtn = box.querySelector(".increase");
            const pcsSpan = box.querySelector(".pcs");

            decreaseBtn.addEventListener("click", () => {
                  let currentQty = parseInt(pcsSpan.textContent);
                  if (currentQty > 1) {
                        pcsSpan.textContent = currentQty - 1;
                  }
            });

            increaseBtn.addEventListener("click", () => {
                  let currentQty = parseInt(pcsSpan.textContent);
                  pcsSpan.textContent = currentQty + 1;
            });

            const addToCartButton = document.createElement("button");
            addToCartButton.className = "btn";
            const isInCart = window.cartStore && window.cartStore.items.some(item => item.itemId === product.id);
            
            addToCartButton.textContent = isInCart ? "Already in cart - Add more?" : "Add to Cart";
            addToCartButton.addEventListener("click", (e) => {
                  addToCart(e, product);
                  addToCartButton.textContent = "Added! Add more?";
                  setTimeout(() => {
                        addToCartButton.textContent = "Already in cart - Add more?";
                  }, 2000);
            });

            box.appendChild(addToCartButton);

            box.querySelector(".quick-view-icon").addEventListener("click", () => {
                  showQuickView(product);
            });

            // Wishlist functionality
            const wishlistIcon = box.querySelector(".wishlist-icon");
            const wishlist = JSON.parse(localStorage.getItem("Yah!_wishlist")) || [];
            const isInWishlist = wishlist.some(item => item.id === product.id);
            
            if (isInWishlist) {
                wishlistIcon.classList.add("active");
            }

            wishlistIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleWishlist(product, wishlistIcon);
            });

            // Rating functionality
            const starsContainer = box.querySelector(".stars");
            const stars = starsContainer.querySelectorAll("i[data-rating]");
            stars.forEach(star => {
                star.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const rating = parseInt(star.dataset.rating);
                    submitRating(product.id, rating);
                });
            });

            productsSection.appendChild(box);
      });
}

function createSortControls() {
      const productsHeader = document.querySelector(".products h1");
      if (!productsHeader) return;

      const sortWrapper = document.createElement("div");
      sortWrapper.className = "sort-container";
      sortWrapper.style.textAlign = "center";
      sortWrapper.style.margin = "20px 0";

      sortWrapper.innerHTML = `
            <label for="sort-products" style="margin-right: 10px; font-weight: 600;">Sort By:</label>
            <select id="sort-products" style="padding: 8px; border-radius: 10px; border: 1px solid var(--secondary-color);">
                  <option value="default">Default</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
            </select>
      `;

      productsHeader.after(sortWrapper);

      const sortSelect = document.getElementById("sort-products");
      sortSelect.addEventListener("change", () => {
            const sortVal = sortSelect.value;
            let currentProducts = Array.from(document.querySelectorAll(".products-box .box")).map(box => {
                  return cloud_products.find(p => p.id === box.id);
            });

            if (sortVal === "price-low") {
                  currentProducts.sort((a, b) => a.price - b.price);
            } else if (sortVal === "price-high") {
                  currentProducts.sort((a, b) => b.price - a.price);
            } else if (sortVal === "rating") {
                  currentProducts.sort((a, b) => b.rating - a.rating);
            } else {
                  // Default to original database order for the filtered set
                  const query = document.getElementById("search-bar")?.value.toLowerCase() || "";
                  const activeFlavor = document.querySelector(".categories-wrapper .active")?.id || "all";
                  
                  currentProducts = cloud_products.filter(p => {
                        const flavorMatch = activeFlavor === "all" || p.flavor_id === activeFlavor;
                        const nameMatch = p.name.toLowerCase().includes(query);
                        return flavorMatch && nameMatch;
                  });
            }
            displayProducts(currentProducts);
      });
}

function displayFlavorFilter() {
      let flavorFilterSection = document.querySelector(".categories-wrapper");
      if (!flavorFilterSection) return;

      flavorFilterSection.innerHTML = "";

      // Create the "All" button
      let allButton = document.createElement("button");
      allButton.setAttribute("id", "all");
      allButton.setAttribute("class", "active");
      allButton.textContent = "All";
      flavorFilterSection.appendChild(allButton);

      allButton.addEventListener("click", () => {
            flavorFilterSection.querySelector(".active")?.classList.remove("active");
            allButton.classList.add("active");
            filterProducts("all", "category");
      });

      // Get unique categories from products
      const categories = [...new Set(cloud_products.map(p => p.category || 'Ice Cream'))];
      
      // Create buttons for each category
      categories.forEach((category) => {
            let button = document.createElement("button");
            button.setAttribute("id", category);
            button.textContent = category;

            button.addEventListener("click", () => {
                  flavorFilterSection.querySelector(".active")?.classList.remove("active");
                  button.classList.add("active");
                  filterProducts(category, "category");
            });

            flavorFilterSection.appendChild(button);
      });

      // Automatically activate the category or flavor from URL if it exists
      const categoryFromURL = getQueryParam("category");
      const flavorFromURL = getQueryParam("flavor");
      
      let targetCategoryId = null;
      if (categoryFromURL) {
            targetCategoryId = categoryFromURL;
      } else if (flavorFromURL) {
            const mappedFlavor = flavors_list.find(f => f.id === flavorFromURL);
            if (mappedFlavor) {
                  targetCategoryId = mappedFlavor.name;
            }
      }

      if (targetCategoryId) {
            const matchingBtn = Array.from(flavorFilterSection.querySelectorAll("button"))
                  .find(b => b.id.toLowerCase() === targetCategoryId.toLowerCase() || b.textContent.toLowerCase() === targetCategoryId.toLowerCase());
            if (matchingBtn) {
                  flavorFilterSection.querySelector(".active")?.classList.remove("active");
                  matchingBtn.classList.add("active");
            }
      }
}

function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
}

function filterProducts(id, filterType = "category") {
      let productsToDisplay = cloud_products;
      if (id && id !== "all") {
            const term = id.toLowerCase();
            if (filterType === "flavor") {
                  productsToDisplay = cloud_products.filter(product => 
                        (product.flavor_id && product.flavor_id.toLowerCase() === term) ||
                        (product.category && product.category.toLowerCase().includes(term))
                  );
                  // If no match found by flavor_id, also check if it's a category name
                  if (productsToDisplay.length === 0) {
                        const flavorObj = flavors_list.find(f => f.id.toLowerCase() === term);
                        if (flavorObj) {
                              productsToDisplay = cloud_products.filter(product => 
                                    (product.category && product.category.toLowerCase() === flavorObj.name.toLowerCase())
                              );
                        }
                  }
            } else {
                  productsToDisplay = cloud_products.filter(product => 
                        (product.category && product.category.toLowerCase() === term) ||
                        (product.flavor_id && product.flavor_id.toLowerCase() === term)
                  );
            }
      }
      displayProducts(productsToDisplay);
}

function addToCart(e, product) {
      const box = e.target.closest(".box");
      const pcs = parseInt(box.querySelector(".pcs").textContent);

      if (window.cartStore) {
            window.cartStore.addItem(product, pcs);
      } else {
            console.error("CartStore not initialized");
      }
}

function createSearchBar() {
      const searchBarContainer = document.querySelector(".search-container");
      if (!searchBarContainer || document.getElementById("search-bar")) return;

      const searchBar = document.createElement("input");
      searchBar.setAttribute("type", "text");
      searchBar.setAttribute("id", "search-bar");
      searchBar.setAttribute("placeholder", "Search for flavors...");
      searchBar.setAttribute("autocomplete", "off");
      searchBarContainer.appendChild(searchBar);

      const searchButton = document.createElement("button");
      searchButton.setAttribute("id", "search-btn");
      searchButton.innerText = "Search";
      searchBarContainer.appendChild(searchButton);

      // Create autocomplete dropdown
      const autocompleteDropdown = document.createElement("div");
      autocompleteDropdown.setAttribute("id", "autocomplete-dropdown");
      autocompleteDropdown.className = "autocomplete-dropdown";
      searchBarContainer.appendChild(autocompleteDropdown);

      searchButton.addEventListener("click", performSearch);
      searchBar.addEventListener("input", performSearch);
      searchBar.addEventListener("input", showAutocomplete);
      searchBar.addEventListener("focus", showAutocomplete);
      
      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
          if (!searchBarContainer.contains(e.target)) {
              autocompleteDropdown.style.display = "none";
          }
      });
}

function performSearch() {
      const query = document.getElementById("search-bar").value.toLowerCase();
      const activeFlavor = document.querySelector(".categories-wrapper .active")?.id || "all";
      
      const filteredProducts = cloud_products.filter((product) => {
            const flavorName = flavors_list.find((f) => f.id === product.flavor_id)?.name?.toLowerCase();
            const flavorMatch = activeFlavor === "all" || product.flavor_id === activeFlavor;
            const searchMatch = (product.name && product.name.toLowerCase().includes(query)) || (flavorName && flavorName.includes(query));
            return flavorMatch && searchMatch;
      });
      displayProducts(filteredProducts);
}

function showAutocomplete() {
      const query = document.getElementById("search-bar").value.toLowerCase();
      const dropdown = document.getElementById("autocomplete-dropdown");
      
      if (!query || query.length < 2) {
          dropdown.style.display = "none";
          return;
      }

      const suggestions = cloud_products
            .filter((product) => {
                  const flavorName = flavors_list.find((f) => f.id === product.flavor_id)?.name?.toLowerCase();
                  return (product.name && product.name.toLowerCase().includes(query)) || 
                         (flavorName && flavorName.includes(query));
            })
            .slice(0, 5);

      if (suggestions.length === 0) {
          dropdown.style.display = "none";
          return;
      }

      dropdown.innerHTML = suggestions.map(product => {
            const flavorName = flavors_list.find((f) => f.id === product.flavor_id)?.name || "";
            return `
                  <div class="autocomplete-item" data-id="${product.id}">
                        <img src="${product.image}" alt="${product.name}" onerror="this.src='./images/logo.png'">
                        <div class="autocomplete-item-info">
                              <span class="autocomplete-name">${product.name}</span>
                              <span class="autocomplete-flavor">${flavorName}</span>
                        </div>
                        <span class="autocomplete-price">GHS ${parseFloat(product.price).toFixed(2)}</span>
                  </div>
            `;
      }).join("");

      dropdown.style.display = "block";

      // Add click handlers to autocomplete items
      dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                  const productId = item.dataset.id;
                  document.getElementById("search-bar").value = item.querySelector('.autocomplete-name').textContent;
                  dropdown.style.display = "none";
                  
                  // Filter to show only the selected product
                  const selectedProduct = cloud_products.find(p => p.id === productId);
                  if (selectedProduct) {
                        displayProducts([selectedProduct]);
                  }
            });
      });
}

function showQuickView(product) {
      const modal = document.getElementById("quickViewModal");
      const flavorName = flavors_list.find((f) => f.id === product.flavor_id)?.name || "Original";
      
      document.getElementById("modalImg").src = product.image;
      document.getElementById("modalName").textContent = product.name;
      document.getElementById("modalCat").textContent = flavorName;
      document.getElementById("modalDesc").textContent = product.description;
      document.getElementById("modalPrice").textContent = `GHS ${parseFloat(product.price).toFixed(2)}`;

      // Reset review UI
      let selectedRating = 0;
      const reviewStars = document.querySelectorAll("#modalReviewStars i");
      const reviewText = document.getElementById("modalReviewText");
      reviewText.value = "";
      reviewStars.forEach(s => {
          s.classList.remove("fas");
          s.classList.add("far");
          s.style.color = "#ccc";
      });

      // Handle star hover/click
      reviewStars.forEach(star => {
          star.onclick = () => {
              selectedRating = parseInt(star.dataset.rating);
              reviewStars.forEach(s => {
                  if (parseInt(s.dataset.rating) <= selectedRating) {
                      s.classList.remove("far");
                      s.classList.add("fas");
                      s.style.color = "#ffc107";
                  } else {
                      s.classList.remove("fas");
                      s.classList.add("far");
                      s.style.color = "#ccc";
                  }
              });
          };
      });

      const submitReviewBtn = document.getElementById("modalSubmitReviewBtn");
      submitReviewBtn.onclick = () => {
          if (selectedRating === 0) {
              if (window.showToast) window.showToast("Please select a rating", "error");
              return;
          }
          submitRating(product.id, selectedRating, reviewText.value.trim());
      };

      modal.style.display = "flex";

      // Global event delegation for close button
      document.addEventListener("click", (e) => {
        const closeBtn = e.target.closest("#closeQuickView");
        if (closeBtn) {
            e.preventDefault();
            e.stopPropagation();
            modal.style.display = "none";
        }
      });

      document.addEventListener("touchstart", (e) => {
        const closeBtn = e.target.closest("#closeQuickView");
        if (closeBtn) {
            e.preventDefault();
            e.stopPropagation();
            modal.style.display = "none";
        }
      });
      
      const addBtn = document.getElementById("modalAddBtn");
      addBtn.onclick = () => {
          if(window.cartStore) {
              window.cartStore.addItem(product, 1);
              if (window.showToast) window.showToast(`Added ${product.name} to cart!`);
          }
          modal.style.display = "none";
      };

      modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = "none";
      };
}

function toggleWishlist(product, iconElement) {
    // Allow guest wishlist - no login required
    const wishlist = JSON.parse(localStorage.getItem("Yah!_wishlist")) || [];
    const index = wishlist.findIndex(item => item.id === product.id);
    
    if (index > -1) {
        // Remove from wishlist
        wishlist.splice(index, 1);
        iconElement.classList.remove("active");
        if (window.showToast) window.showToast("Removed from wishlist", "info");
    } else {
        // Add to wishlist
        wishlist.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image
        });
        iconElement.classList.add("active");
        if (window.showToast) window.showToast("Added to wishlist! ❤️", "success");
    }
    
    localStorage.setItem("Yah!_wishlist", JSON.stringify(wishlist));

    if (user && user.email) {
        import("./supabase.js").then(({ toggleCloudWishlist }) => {
            toggleCloudWishlist(user.email, {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image
            });
        });
    }
}

function submitRating(productId, rating, reviewText = "") {
    // Allow guest ratings - no login required
    const user = JSON.parse(localStorage.getItem("Yah!_user")) || { email: "guest@yah.com" };

    // Get existing ratings
    const ratings = JSON.parse(localStorage.getItem("Yah!_ratings")) || {};
    
    // Check if user already rated this product
    const userRatings = ratings[productId] || {};
    if (userRatings[user.email]) {
        if (window.showToast) window.showToast("You've already rated this product", "info");
        return;
    }

    // Save rating locally to prevent double voting in this session
    userRatings[user.email] = rating;
    ratings[productId] = userRatings;
    localStorage.setItem("Yah!_ratings", JSON.stringify(ratings));

    if (user && user.email) {
        import("./supabase.js").then(({ submitProductReview }) => {
            submitProductReview(productId, user.email, rating, reviewText).then(({error}) => {
                if (error) {
                    console.error("Review submission error:", error);
                    if (window.showToast) window.showToast("Could not save review. Please try again.", "error");
                } else {
                    if (window.showToast) window.showToast(`Rated ${rating} stars! Thank you! ⭐`, "success");
                    document.getElementById("modalReviewText").value = "";
                }
            });
        });
    }
}
