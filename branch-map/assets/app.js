/* Bản đồ chi nhánh toàn quốc — Leaflet + MarkerCluster + PapaParse */
(function () {
  "use strict";

  var CFG = Object.assign({
    brandName: "Bản đồ Chi nhánh", brandTagline: "", logoUrl: "",
    primaryColor: "#1434a4", secondaryColor: "#e8222d", tertiaryColor: "#0f9d58",
    dataUrl: "data/branches.csv", showSampleBanner: false, tourIntervalSeconds: 6, hotline: ""
  }, window.APP_CONFIG || {});

  var PROVINCES = window.VN_PROVINCES;
  var REGIONS = window.VN_REGIONS;
  var VN_BOUNDS = L.latLngBounds([8.4, 102.1], [23.4, 109.6]);
  var EXTRA_COLORS = ["#f29900", "#8e24aa", "#00897b", "#6d4c41"];

  // ---------- Helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/đ/g, "d").normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  }
  function provKey(s) {
    return norm(s).replace(/^(thanh pho|tp\.?|tinh)\s*/, "").replace(/[^a-z0-9]/g, "");
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^(https?:\/\/|\/|[\w.-]+\/)/i.test(u) && !/^javascript:/i.test(u) ? u : "";
  }
  function distKm(a, b) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtKm(km) { return km < 1 ? Math.round(km * 1000) + " m" : (km < 10 ? km.toFixed(1) : Math.round(km)) + " km"; }
  var toastTimer;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function isMobile() { return window.matchMedia("(max-width: 820px)").matches; }

  // Tra cứu tỉnh: chấp nhận tên mới, tên cũ (trước sáp nhập) và biến thể "TP.", "Tỉnh"
  var provIndex = {};
  PROVINCES.forEach(function (p, i) {
    p.order = i;
    provIndex[provKey(p.name)] = p;
    p.merged.forEach(function (m) { provIndex[provKey(m)] = provIndex[provKey(m)] || p; });
  });
  provIndex[provKey("Hồ Chí Minh")] = provIndex[provKey("TP. Hồ Chí Minh")];
  provIndex[provKey("Thừa Thiên Huế")] = provIndex[provKey("Huế")];
  provIndex[provKey("Sài Gòn")] = provIndex[provKey("TP. Hồ Chí Minh")];

  // ---------- Branding ----------
  var root = document.documentElement.style;
  root.setProperty("--primary", CFG.primaryColor);
  root.setProperty("--secondary", CFG.secondaryColor);
  root.setProperty("--tertiary", CFG.tertiaryColor);
  root.setProperty("--tour-ms", CFG.tourIntervalSeconds * 1000 + "ms");
  document.title = CFG.brandName;
  $("brandName").textContent = CFG.brandName;
  $("brandTagline").textContent = CFG.brandTagline;
  if (CFG.logoUrl) { $("brandLogo").src = CFG.logoUrl; $("brandLogo").hidden = false; }
  if (CFG.showSampleBanner) {
    $("sampleBanner").hidden = false;
    $("sampleBanner").querySelector(".banner-close").onclick = function () {
      $("sampleBanner").hidden = true; setTimeout(function () { map.invalidateSize(); }, 50);
    };
  }

  // ---------- Map ----------
  var map = L.map("map", { zoomControl: false, minZoom: 5, maxZoom: 19, worldCopyJump: false })
    .fitBounds(VN_BOUNDS);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);

  var baseLayers = [
    { name: "Bản đồ đường phố", layer: L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }) },
    { name: "OpenStreetMap", layer: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }) },
    { name: "Ảnh vệ tinh", layer: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19, attribution: "Tiles &copy; Esri" }) }
  ];
  var layerIdx = 0;
  baseLayers[0].layer.addTo(map);
  $("btnLayer").onclick = function () {
    map.removeLayer(baseLayers[layerIdx].layer);
    layerIdx = (layerIdx + 1) % baseLayers.length;
    baseLayers[layerIdx].layer.addTo(map);
    toast("Lớp bản đồ: " + baseLayers[layerIdx].name);
  };

  // Chủ quyền biển đảo
  [[[16.45, 111.9], "Quần đảo Hoàng Sa<br>(Việt Nam)"], [[10.2, 114.3], "Quần đảo Trường Sa<br>(Việt Nam)"]]
    .forEach(function (d) {
      L.marker(d[0], { interactive: false, keyboard: false,
        icon: L.divIcon({ className: "island-label", html: d[1], iconSize: [170, 34], iconAnchor: [85, 17] }) }).addTo(map);
    });

  var cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 50, spiderfyOnMaxZoom: true,
    iconCreateFunction: function (c) {
      var n = c.getChildCount(), s = n < 10 ? 34 : n < 50 ? 42 : 50;
      return L.divIcon({ html: "<span>" + n + "</span>", className: "cluster", iconSize: [s, s] });
    }
  }).addTo(map);

  $("btnHome").onclick = function () { stopTour(); map.flyToBounds(VN_BOUNDS, { duration: 0.8 }); };
  $("btnFull").onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  };

  // ---------- State ----------
  var branches = [], byId = {}, types = [], typeColor = {};
  var state = { q: "", region: "", province: "", type: "", view: "branches" };
  var userLoc = null, meMarker = null, current = null, filtered = [];

  function pinIcon(b, active) {
    var col = typeColor[b.type] || CFG.primaryColor;
    var letter = esc((b.type || "?").trim().charAt(0).toUpperCase());
    return L.divIcon({
      className: "", iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -36],
      html: '<div class="pin' + (active ? " active" : "") + '"><svg viewBox="0 0 30 40"><path fill="' + col +
        '" d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z"/></svg><b>' + letter + "</b></div>"
    });
  }

  // ---------- Data ----------
  function load() {
    Papa.parse(CFG.dataUrl, {
      download: true, header: true, skipEmptyLines: "greedy",
      transformHeader: function (h) { return h.trim().toLowerCase(); },
      complete: function (res) { init(res.data); },
      error: function (err) {
        var l = $("loading"); l.classList.add("error");
        l.innerHTML = "<p><b>Không tải được dữ liệu.</b><br>" + esc(err && err.message || err) +
          "<br><br>Nếu mở file trực tiếp (file://), hãy chạy qua web server (vd. <code>npx serve</code>) hoặc deploy lên Netlify.</p>";
      }
    });
  }

  function init(rows) {
    var skipped = 0, seen = {};
    rows.forEach(function (r, i) {
      var lat = parseFloat(String(r.lat || "").replace(",", ".")),
          lng = parseFloat(String(r.lng || r.lon || "").replace(",", "."));
      if (!r.name || isNaN(lat) || isNaN(lng) || lat < 7 || lat > 24 || lng < 101 || lng > 118) { skipped++; return; }
      var prov = provIndex[provKey(r.province)] || provIndex[provKey(r.old_province)];
      var oldProv = (r.old_province || "").trim();
      if (!oldProv && prov && provKey(r.province) !== provKey(prov.name)) oldProv = r.province.trim();
      var id = (r.id || "").trim() || "b" + (i + 1);
      while (seen[id]) id += "-" + (i + 1);
      seen[id] = 1;
      var b = {
        id: id, name: r.name.trim(), type: (r.type || "Chi nhánh").trim(),
        province: prov ? prov.name : (r.province || "Khác").trim(), prov: prov || null,
        region: prov ? prov.region : "", oldProvince: oldProv,
        address: (r.address || "").trim(), lat: lat, lng: lng,
        phone: (r.phone || "").trim(), hours: (r.hours || "").trim(), manager: (r.manager || "").trim(),
        email: (r.email || "").trim(), image: safeUrl(r.image), note: (r.note || "").trim(),
        services: (r.services || "").split(/[;|]/).map(function (s) { return s.trim(); }).filter(Boolean)
      };
      b.search = norm([b.name, b.type, b.province, b.oldProvince, b.address, b.services.join(" "), b.manager].join(" "));
      b.marker = L.marker([lat, lng], { icon: pinIcon(b), title: b.name, riseOnHover: true });
      b.marker.on("click", function () { stopTour(); select(b); });
      branches.push(b); byId[id] = b;
    });

    // Loại điểm: sắp theo số lượng giảm dần, gán màu
    var tc = {};
    branches.forEach(function (b) { tc[b.type] = (tc[b.type] || 0) + 1; });
    var PREFERRED = ["chi nhanh", "phong giao dich"];
    function rank(t) { var i = PREFERRED.indexOf(norm(t)); return i < 0 ? 99 : i; }
    types = Object.keys(tc).sort(function (a, b) { return rank(a) - rank(b) || tc[b] - tc[a]; });
    var palette = [CFG.primaryColor, CFG.secondaryColor, CFG.tertiaryColor].concat(EXTRA_COLORS);
    types.forEach(function (t, i) { typeColor[t] = palette[i % palette.length]; });
    branches.forEach(function (b) { b.marker.setIcon(pinIcon(b)); });
    branches.sort(function (a, b) {
      var oa = a.prov ? a.prov.order : 99, ob = b.prov ? b.prov.order : 99;
      return oa - ob || types.indexOf(a.type) - types.indexOf(b.type) || a.name.localeCompare(b.name, "vi");
    });

    buildControls(tc);
    renderStats();
    $("loading").hidden = true;
    if (skipped) toast("Bỏ qua " + skipped + " dòng thiếu tên hoặc tọa độ không hợp lệ");
    applyFilters(true);
    readHash();
  }

  // ---------- Controls ----------
  function buildControls(tc) {
    var chips = $("regionChips");
    var regionCount = {};
    branches.forEach(function (b) { regionCount[b.region] = (regionCount[b.region] || 0) + 1; });
    var chipHtml = '<button class="chip active" data-region="">Toàn quốc <small>' + branches.length + "</small></button>";
    Object.keys(REGIONS).forEach(function (k) {
      chipHtml += '<button class="chip" data-region="' + k + '">' + esc(REGIONS[k]) + " <small>" + (regionCount[k] || 0) + "</small></button>";
    });
    chips.innerHTML = chipHtml;
    chips.onclick = function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      state.region = c.dataset.region;
      if (state.province && byProvince(state.province).region !== state.region && state.region) state.province = "";
      syncControls(); applyFilters(true);
    };

    fillProvinceSelect();
    $("selProvince").onchange = function () { setProvince(this.value); };

    $("selType").innerHTML = '<option value="">Tất cả loại điểm</option>' + types.map(function (t) {
      return '<option value="' + esc(t) + '">' + esc(t) + " (" + tc[t] + ")</option>";
    }).join("");
    $("selType").onchange = function () { state.type = this.value; applyFilters(true); };

    $("legend").innerHTML = types.map(function (t) {
      return '<span><i style="background:' + typeColor[t] + '"></i>' + esc(t) + "</span>";
    }).join("");

    var qTimer;
    $("q").oninput = function () {
      var v = this.value; clearTimeout(qTimer);
      qTimer = setTimeout(function () { state.q = norm(v); applyFilters(false); }, 120);
    };
    $("q").onkeydown = function (e) { if (e.key === "Enter" && filtered[0]) select(filtered[0]); };

    $("btnReset").onclick = function () {
      state = { q: "", region: "", province: "", type: "", view: state.view };
      $("q").value = ""; syncControls(); applyFilters(true);
    };
    $("btnNear").onclick = locate;
    $("btnBack").onclick = closeDetail;

    document.querySelectorAll(".tab").forEach(function (t) {
      t.onclick = function () { state.view = t.dataset.view; syncControls(); renderList(); };
    });

    var foot = [];
    if (CFG.hotline) foot.push('Hotline: <a href="tel:' + esc(CFG.hotline.replace(/\s/g, "")) + '">' + esc(CFG.hotline) + "</a>");
    foot.push("<span>34 tỉnh/thành · địa giới từ 01/07/2025</span>");
    $("sideFoot").innerHTML = foot.join("");

    $("btnToggleSidebar").onclick = function () { document.body.classList.toggle("sheet-open"); };
    $("sidebar").addEventListener("click", function (e) {
      if (isMobile() && !document.body.classList.contains("sheet-open") && !e.target.closest("input,select,button,.item")) {
        document.body.classList.add("sheet-open");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); $("q").focus(); }
      if (e.key === "Escape") { if (tourTimer) stopTour(); else if (!$("detailPanel").hidden) closeDetail(); }
    });
    window.addEventListener("hashchange", readHash);
  }

  function byProvince(name) { return provIndex[provKey(name)] || {}; }

  function fillProvinceSelect() {
    var counts = {};
    branches.forEach(function (b) { counts[b.province] = (counts[b.province] || 0) + 1; });
    var html = '<option value="">Tất cả 34 tỉnh/thành</option>';
    Object.keys(REGIONS).forEach(function (k) {
      if (state.region && state.region !== k) return;
      html += '<optgroup label="' + esc(REGIONS[k]) + '">';
      PROVINCES.filter(function (p) { return p.region === k; }).forEach(function (p) {
        html += '<option value="' + esc(p.name) + '">' + esc(p.name) + " (" + (counts[p.name] || 0) + ")</option>";
      });
      html += "</optgroup>";
    });
    $("selProvince").innerHTML = html;
    $("selProvince").value = state.province;
  }

  function syncControls() {
    document.querySelectorAll("#regionChips .chip").forEach(function (c) {
      c.classList.toggle("active", c.dataset.region === state.region);
    });
    fillProvinceSelect();
    $("selType").value = state.type;
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.view === state.view); });
    $("list").hidden = state.view !== "branches";
    $("provList").hidden = state.view !== "provinces";
  }

  function setProvince(name) {
    state.province = name;
    if (name) { state.region = byProvince(name).region || state.region; state.view = "branches"; }
    syncControls(); applyFilters(true);
  }

  // ---------- Filtering & rendering ----------
  function matches(b, ignoreProvince) {
    if (state.region && b.region !== state.region) return false;
    if (!ignoreProvince && state.province && b.province !== state.province) return false;
    if (state.type && b.type !== state.type) return false;
    if (state.q) {
      var words = state.q.split(" ");
      for (var i = 0; i < words.length; i++) if (b.search.indexOf(words[i]) < 0) return false;
    }
    return true;
  }

  function applyFilters(fit) {
    filtered = branches.filter(function (b) { return matches(b); });
    if (userLoc) {
      filtered.forEach(function (b) { b.dist = distKm(userLoc, [b.lat, b.lng]); });
      filtered.sort(function (a, b) { return a.dist - b.dist; });
    }
    cluster.clearLayers();
    cluster.addLayers(filtered.map(function (b) { return b.marker; }));
    renderList();
    renderStats();
    if (tourTimer) { tourIdx = -1; }
    if (fit) fitTo(filtered);
  }

  function fitTo(list) {
    if (!list.length) return;
    if (list.length === 1) { map.flyTo([list[0].lat, list[0].lng], 15, { duration: 0.8 }); return; }
    var bounds = L.latLngBounds(list.map(function (b) { return [b.lat, b.lng]; }));
    if (!state.region && !state.province && !state.q && !state.type) bounds = VN_BOUNDS;
    map.flyToBounds(bounds.pad(0.08), { duration: 0.8, maxZoom: 13, paddingTopLeft: [10, 10], paddingBottomRight: [10, 80] });
  }

  function itemHtml(b) {
    return '<li class="item' + (current === b ? " current" : "") + '" data-id="' + esc(b.id) + '" tabindex="0">' +
      '<span class="dot" style="background:' + typeColor[b.type] + '">' + esc(b.type.charAt(0).toUpperCase()) + "</span>" +
      "<div><h3>" + esc(b.name) + "</h3><p>" + esc(b.address || b.province) + "</p></div>" +
      (userLoc ? '<span class="dist">' + fmtKm(b.dist) + "</span>" : "") + "</li>";
  }

  function renderList() {
    var meta = filtered.length + " điểm";
    var provSet = {};
    filtered.forEach(function (b) { provSet[b.province] = 1; });
    meta += " · " + Object.keys(provSet).length + " tỉnh/thành";
    if (userLoc) meta += " · sắp xếp theo khoảng cách";
    $("resultMeta").textContent = meta;

    var html = "";
    if (!filtered.length) {
      html = '<li class="empty">Không tìm thấy điểm phù hợp.<br>Thử bỏ bớt bộ lọc.</li>';
    } else if (userLoc) {
      html = filtered.map(itemHtml).join("");
    } else {
      var last = null;
      filtered.forEach(function (b) {
        if (b.province !== last) {
          last = b.province;
          html += '<li class="group-title">' + esc(b.province) + "</li>";
        }
        html += itemHtml(b);
      });
    }
    var list = $("list");
    list.innerHTML = html;
    list.onclick = function (e) {
      var it = e.target.closest(".item"); if (!it) return;
      stopTour(); select(byId[it.dataset.id]);
    };
    list.onkeydown = function (e) {
      if (e.key === "Enter" && e.target.classList.contains("item")) { stopTour(); select(byId[e.target.dataset.id]); }
    };

    // Danh sách theo tỉnh (bỏ qua bộ lọc tỉnh để luôn thấy cả 34)
    var counts = {};
    branches.forEach(function (b) { if (matches(b, true)) counts[b.province] = (counts[b.province] || 0) + 1; });
    var ph = "";
    Object.keys(REGIONS).forEach(function (k) {
      if (state.region && state.region !== k) return;
      ph += '<li class="group-title">' + esc(REGIONS[k]) + "</li>";
      PROVINCES.filter(function (p) { return p.region === k; }).forEach(function (p) {
        ph += '<li class="item' + (state.province === p.name ? " current" : "") + '" data-prov="' + esc(p.name) + '" tabindex="0">' +
          '<span class="dot" style="background:var(--primary)">' + (counts[p.name] || 0) + "</span>" +
          "<div><h3>" + esc(p.name) + "</h3><p>" + (p.merged.length ? "Gồm: " + esc([p.name.replace("TP. ", "")].concat(p.merged).join(", ")) : "Giữ nguyên") + "</p></div></li>";
      });
    });
    var pl = $("provList");
    pl.innerHTML = ph;
    pl.onclick = function (e) {
      var it = e.target.closest(".item"); if (!it) return;
      var name = it.dataset.prov;
      if (!counts[name]) {
        var p = byProvince(name);
        map.flyTo(p.center, 10, { duration: 0.8 });
        toast(name + ": chưa có điểm phù hợp bộ lọc");
        return;
      }
      setProvince(name);
    };
  }

  function renderStats() {
    var list = filtered.length || state.q || state.region || state.province || state.type ? filtered : branches;
    var provs = {};
    list.forEach(function (b) { provs[b.province] = 1; });
    var html = '<div class="stat"><b>' + list.length + "</b><span>Điểm giao dịch</span></div>";
    types.slice(0, 2).forEach(function (t) {
      html += '<div class="stat"><b>' + list.filter(function (b) { return b.type === t; }).length + "</b><span>" + esc(t) + "</span></div>";
    });
    html += '<div class="stat"><b>' + Object.keys(provs).length + "/34</b><span>Tỉnh/thành</span></div>";
    $("stats").innerHTML = html;
  }

  // ---------- Selection & detail ----------
  function select(b, opts) {
    if (!b) return;
    opts = opts || {};
    if (current && current !== b) current.marker.setIcon(pinIcon(current));
    current = b;
    b.marker.setIcon(pinIcon(b, true));
    b.marker.setZIndexOffset(1000);

    if (!cluster.hasLayer(b.marker)) {
      // Điểm bị ẩn bởi bộ lọc: xóa lọc để hiển thị
      state = { q: "", region: "", province: "", type: "", view: state.view };
      $("q").value = ""; syncControls(); applyFilters(false);
    }
    var targetZoom = Math.max(map.getZoom(), 15);
    var opened = false;
    function openPopup() {
      if (opened || current !== b) return;
      opened = true;
      cluster.zoomToShowLayer(b.marker, function () {
        if (current === b) b.marker.bindPopup(popupHtml(b), { maxWidth: 260, autoPanPadding: [20, 90] }).openPopup();
      });
    }
    map.once("moveend", openPopup);
    setTimeout(openPopup, (opts.tour ? 1.6 : 0.9) * 1000 + 300);
    map.flyTo([b.lat, b.lng], targetZoom, { duration: opts.tour ? 1.6 : 0.9 });

    renderDetail(b);
    document.querySelectorAll("#list .item").forEach(function (el) { el.classList.toggle("current", el.dataset.id === b.id); });
    if (!opts.noHash) history.replaceState(null, "", "#id=" + encodeURIComponent(b.id));
    if (isMobile() && !opts.tour) document.body.classList.add("sheet-open");
  }

  function dirUrl(b) { return "https://www.google.com/maps/dir/?api=1&destination=" + b.lat + "," + b.lng; }

  function popupHtml(b) {
    return '<div class="pop"><h3>' + esc(b.name) + "</h3><p>" + esc(b.address) + "</p>" +
      '<div class="pop-actions"><a class="btn" target="_blank" rel="noopener" href="' + dirUrl(b) + '">Chỉ đường</a>' +
      (b.phone ? '<a class="btn ghost" href="tel:' + esc(b.phone.replace(/[^\d+]/g, "")) + '">Gọi</a>' : "") + "</div></div>";
  }

  var ICONS = {
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    nav: '<svg viewBox="0 0 24 24"><path d="m3 11 19-9-9 19-2-8z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>'
  };

  function infoRow(icon, label, val) {
    return val ? "<li>" + ICONS[icon] + "<div><b>" + label + "</b>" + val + "</div></li>" : "";
  }

  function renderDetail(b) {
    var col = typeColor[b.type];
    var provLine = esc(b.province) + (b.oldProvince && provKey(b.oldProvince) !== provKey(b.province)
      ? ' <span style="color:var(--muted)">(trước đây: ' + esc(b.oldProvince) + ")</span>" : "");
    var near = branches.filter(function (x) { return x !== b; })
      .map(function (x) { return { b: x, d: distKm([b.lat, b.lng], [x.lat, x.lng]) }; })
      .sort(function (x, y) { return x.d - y.d; }).slice(0, 3);

    var html =
      '<div class="d-hero"' + (b.image ? ' style="background-image:url(&quot;' + esc(b.image) + '&quot;)"' : "") + ">" +
      '<span class="badge" style="background:' + col + '">' + esc(b.type) + "</span></div>" +
      '<div class="d-body"><h2>' + esc(b.name) + '</h2><p class="d-sub">' + provLine + "</p>" +
      '<div class="d-actions">' +
      '<a class="btn" target="_blank" rel="noopener" href="' + dirUrl(b) + '">' + ICONS.nav + "Chỉ đường</a>" +
      (b.phone ? '<a class="btn ghost" href="tel:' + esc(b.phone.replace(/[^\d+]/g, "")) + '">' + ICONS.phone + "Gọi</a>"
               : '<span class="btn ghost" style="opacity:.4">' + ICONS.phone + "Gọi</span>") +
      '<button class="btn ghost" id="btnShare">' + ICONS.share + "Chia sẻ</button></div>" +
      '<ul class="info">' +
      infoRow("pin", "Địa chỉ", esc(b.address)) +
      infoRow("phone", "Điện thoại", b.phone ? '<a href="tel:' + esc(b.phone.replace(/[^\d+]/g, "")) + '">' + esc(b.phone) + "</a>" : "") +
      infoRow("clock", "Giờ làm việc", esc(b.hours).replace(/;\s*/g, "<br>")) +
      infoRow("user", "Phụ trách", esc(b.manager)) +
      infoRow("mail", "Email", b.email ? '<a href="mailto:' + esc(b.email) + '">' + esc(b.email) + "</a>" : "") +
      infoRow("map", "Tọa độ", '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + b.lat + "," + b.lng + '">' +
        b.lat.toFixed(5) + ", " + b.lng.toFixed(5) + "</a>") +
      "</ul>" +
      (b.services.length ? '<div class="tags">' + b.services.map(function (s) { return '<span class="tag">' + esc(s) + "</span>"; }).join("") + "</div>" : "") +
      (b.note ? '<div class="note">' + esc(b.note) + "</div>" : "") +
      (near.length ? '<div class="nearby"><h4>Điểm gần nhất</h4><ul class="list" style="padding:0">' +
        near.map(function (n) {
          return '<li class="item" data-id="' + esc(n.b.id) + '"><span class="dot" style="background:' + typeColor[n.b.type] + '">' +
            esc(n.b.type.charAt(0)) + "</span><div><h3>" + esc(n.b.name) + "</h3><p>" + esc(n.b.province) +
            '</p></div><span class="dist">' + fmtKm(n.d) + "</span></li>";
        }).join("") + "</ul></div>" : "") +
      "</div>";

    $("detail").innerHTML = html;
    $("listPanel").hidden = true;
    $("detailPanel").hidden = false;
    $("detailPanel").scrollTop = 0;
    $("btnShare").onclick = function () {
      var url = location.href.split("#")[0] + "#id=" + encodeURIComponent(b.id);
      if (navigator.share && isMobile()) { navigator.share({ title: b.name, url: url }).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
        .then(function () { toast("Đã sao chép liên kết"); }, function () { prompt("Sao chép liên kết:", url); });
    };
    $("detail").querySelector(".nearby") && ($("detail").querySelector(".nearby").onclick = function (e) {
      var it = e.target.closest(".item"); if (it) { stopTour(); select(byId[it.dataset.id]); }
    });
  }

  function closeDetail() {
    $("detailPanel").hidden = true;
    $("listPanel").hidden = false;
    map.closePopup();
    if (current) { current.marker.setIcon(pinIcon(current)); current.marker.setZIndexOffset(0); }
    current = null;
    history.replaceState(null, "", location.pathname + location.search);
    var el = document.querySelector("#list .item.current"); if (el) el.classList.remove("current");
  }

  function readHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    var m = /^id=(.+)$/.exec(h);
    if (m && byId[m[1]]) { select(byId[m[1]], { noHash: true }); return; }
    m = /^tinh=(.+)$/.exec(h);
    if (m && byProvince(m[1]).name) setProvince(byProvince(m[1]).name);
  }

  // ---------- Near me ----------
  function locate() {
    if (userLoc) { // bật/tắt
      userLoc = null; if (meMarker) map.removeLayer(meMarker); meMarker = null;
      $("btnNear").classList.remove("active"); applyFilters(true); return;
    }
    if (!navigator.geolocation) { toast("Trình duyệt không hỗ trợ định vị"); return; }
    toast("Đang xác định vị trí…");
    navigator.geolocation.getCurrentPosition(function (pos) {
      userLoc = [pos.coords.latitude, pos.coords.longitude];
      meMarker = L.marker(userLoc, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000 })
        .bindTooltip("Vị trí của bạn").addTo(map);
      $("btnNear").classList.add("active");
      state.view = "branches"; syncControls();
      applyFilters(false);
      if (filtered[0]) {
        map.flyToBounds(L.latLngBounds([userLoc].concat(filtered.slice(0, 3).map(function (b) { return [b.lat, b.lng]; }))).pad(0.2), { maxZoom: 15 });
        toast("Gần nhất: " + filtered[0].name + " (" + fmtKm(filtered[0].dist) + ")");
      }
    }, function (err) {
      toast(err.code === 1 ? "Bạn đã từ chối quyền truy cập vị trí" : "Không lấy được vị trí");
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  // ---------- Tour ----------
  var tourTimer = null, tourIdx = -1;
  function tourStep(dir) {
    if (!filtered.length) { stopTour(); toast("Không có điểm nào để tour"); return; }
    var i = current ? filtered.indexOf(current) : tourIdx;
    tourIdx = ((i < 0 ? (dir > 0 ? -1 : 0) : i) + dir + filtered.length) % filtered.length;
    var b = filtered[tourIdx];
    select(b, { tour: true });
    $("tourInfo").textContent = (tourIdx + 1) + "/" + filtered.length + " · " + b.name;
    var bar = $("tourProgress");
    bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
  }
  function armTimer() {
    clearInterval(tourTimer);
    tourTimer = setInterval(function () { tourStep(1); }, CFG.tourIntervalSeconds * 1000);
  }
  function startTour() {
    $("tourbar").classList.add("playing");
    $("tourLabel").textContent = "Dừng";
    if (isMobile()) document.body.classList.remove("sheet-open");
    tourStep(1);
    armTimer();
  }
  function stopTour() {
    if (!tourTimer) return;
    clearInterval(tourTimer); tourTimer = null;
    $("tourbar").classList.remove("playing");
    $("tourLabel").textContent = "Tour";
  }
  $("tourPlay").onclick = function () { tourTimer ? stopTour() : startTour(); };
  $("tourNext").onclick = function () { tourStep(1); if (tourTimer) armTimer(); };
  $("tourPrev").onclick = function () { tourStep(-1); if (tourTimer) armTimer(); };
  map.on("dragstart", stopTour);

  load();
})();
