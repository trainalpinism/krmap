const mapContainer = document.getElementById("map");
const markerListEl = document.getElementById("markerList");
const markerCountEl = document.getElementById("markerCount");
const markerCardTemplate = document.getElementById("markerCardTemplate");
const statusBannerEl = document.getElementById("statusBanner");
const NCP_CLIENT_ID = "qb0c5ahrwa";

const COLOR_MAP = {
  red: "#e53935",
  blue: "#1e88e5",
  green: "#2e7d32",
  yellow: "#f9a825",
  purple: "#8e24aa",
  orange: "#ef6c00",
};

const markers = [];
let map;
let nextSequence = 1;

function showStatus(message) {
  if (!statusBannerEl) {
    return;
  }

  statusBannerEl.textContent = message;
  statusBannerEl.hidden = false;
}

function hideStatus() {
  if (!statusBannerEl) {
    return;
  }

  statusBannerEl.hidden = true;
}

function createMarkerHTML(number, colorKey) {
  const bg = COLOR_MAP[colorKey] || COLOR_MAP.red;
  return `<div class="number-marker" style="background:${bg}">${number}</div>`;
}

function buildInfoWindowContent(item) {
  const photoHtml = item.photo
    ? `<img src="${item.photo}" alt="${item.name}" style="width:190px;height:120px;object-fit:cover;border-radius:8px;margin-top:8px;" />`
    : "";

  return `
    <div style="padding:8px;max-width:210px;font-family:'Noto Sans KR',sans-serif;">
      <div style="font-weight:700;">${item.name}</div>
      <div style="font-size:12px;color:#4b5563;">번호 ${item.number}</div>
      ${photoHtml}
    </div>
  `;
}

function updateMarkerIcon(item) {
  item.marker.setIcon({
    content: createMarkerHTML(item.number, item.color),
    anchor: new naver.maps.Point(17, 17),
  });
}

function updateInfoWindow(item) {
  if (!item.infoWindow) {
    item.infoWindow = new naver.maps.InfoWindow({
      content: buildInfoWindowContent(item),
      borderWidth: 0,
      backgroundColor: "transparent",
      anchorSize: new naver.maps.Size(0, 0),
      pixelOffset: new naver.maps.Point(0, -14),
    });
    return;
  }

  item.infoWindow.setContent(buildInfoWindowContent(item));
}

function renderMarkerList() {
  markerListEl.innerHTML = "";

  markers.forEach((item) => {
    const fragment = markerCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".marker-card");
    const badge = fragment.querySelector(".badge");
    const nameInput = fragment.querySelector(".name-input");
    const colorSelect = fragment.querySelector(".color-select");
    const photoInput = fragment.querySelector(".photo-input");
    const photoPreview = fragment.querySelector(".photo-preview");
    const deleteBtn = fragment.querySelector(".delete-btn");

    badge.textContent = item.number;
    badge.style.background = COLOR_MAP[item.color];

    nameInput.value = item.name;
    colorSelect.value = item.color;

    if (item.photo) {
      photoPreview.classList.remove("empty");
      photoPreview.innerHTML = `<img src="${item.photo}" alt="${item.name}" />`;
    } else {
      photoPreview.classList.add("empty");
      photoPreview.textContent = "사진 없음";
    }

    nameInput.addEventListener("input", (event) => {
      item.name = event.target.value.trim() || `장소 ${item.number}`;
      updateInfoWindow(item);

      if (item.infoWindow.getMap()) {
        item.infoWindow.open(map, item.marker);
      }
    });

    colorSelect.addEventListener("change", (event) => {
      item.color = event.target.value;
      badge.style.background = COLOR_MAP[item.color];
      updateMarkerIcon(item);
    });

    photoInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        item.photo = reader.result;
        photoPreview.classList.remove("empty");
        photoPreview.innerHTML = `<img src="${item.photo}" alt="${item.name}" />`;
        updateInfoWindow(item);
      };
      reader.readAsDataURL(file);
    });

    deleteBtn.addEventListener("click", () => {
      item.marker.setMap(null);
      if (item.infoWindow) {
        item.infoWindow.close();
      }

      const idx = markers.findIndex((m) => m.id === item.id);
      if (idx >= 0) {
        markers.splice(idx, 1);
      }

      renderMarkerList();
      markerCountEl.textContent = String(markers.length);
    });

    card.addEventListener("mouseenter", () => {
      updateInfoWindow(item);
      item.infoWindow.open(map, item.marker);
    });

    card.addEventListener("mouseleave", () => {
      if (item.infoWindow) {
        item.infoWindow.close();
      }
    });

    markerListEl.appendChild(fragment);
  });

  markerCountEl.textContent = String(markers.length);
}

function createMarkerAt(latlng) {
  const number = nextSequence;
  nextSequence += 1;

  const item = {
    id: Date.now() + Math.random(),
    number,
    name: `장소 ${number}`,
    color: "red",
    photo: null,
    marker: null,
    infoWindow: null,
  };

  item.marker = new naver.maps.Marker({
    map,
    position: latlng,
    icon: {
      content: createMarkerHTML(item.number, item.color),
      anchor: new naver.maps.Point(17, 17),
    },
    title: item.name,
  });

  updateInfoWindow(item);

  naver.maps.Event.addListener(item.marker, "click", () => {
    updateInfoWindow(item);
    if (item.infoWindow.getMap()) {
      item.infoWindow.close();
    } else {
      item.infoWindow.open(map, item.marker);
    }
  });

  markers.push(item);
  renderMarkerList();
}

function initMap() {
  try {
    map = new naver.maps.Map(mapContainer, {
      center: new naver.maps.LatLng(37.5666102, 126.9783881),
      zoom: 12,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    });

    hideStatus();

    naver.maps.Event.addListener(map, "click", (event) => {
      createMarkerAt(event.coord);
    });
  } catch (error) {
    showStatus(
      "지도 초기화 실패: 네이버 클라우드 서비스 URL 허용 목록과 현재 접속 주소가 일치하는지 확인하세요."
    );
    console.error(error);
  }
}

function validateNaverMapAuth() {
  return new Promise((resolve) => {
    const callbackName = `naverMapAuthCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const url =
      "https://oapi.map.naver.com/v1/validatev3"
      + `?ncpClientId=${encodeURIComponent(NCP_CLIENT_ID)}`
      + `&uri=${encodeURIComponent(window.location.href)}`
      + `&time=${Date.now()}`
      + `&callback=${callbackName}`;

    let finished = false;

    function cleanup() {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window[callbackName];
    }

    function done(result) {
      if (finished) {
        return;
      }
      finished = true;
      cleanup();
      resolve(result);
    }

    window[callbackName] = (data) => {
      if (data && data.result) {
        done({ ok: true });
        return;
      }

      const errorCode = data && data.error ? data.error.errorCode || "" : "";
      const message = data && data.error ? data.error.message || data.error.errorMessage || "" : "";
      const details = data && data.error ? data.error.details || "" : "";

      done({ ok: false, errorCode, message, details });
    };

    script.onerror = () => {
      done({ ok: false, errorCode: "NETWORK", message: "Validation script load failed", details: "" });
    };

    script.src = url;
    document.head.appendChild(script);

    setTimeout(() => {
      done({ ok: false, errorCode: "TIMEOUT", message: "Validation timeout", details: "" });
    }, 6000);
  });
}

async function boot() {
  if (window.location.protocol === "file:") {
    showStatus(
      "현재 file:// 로 열려 있습니다. 네이버 지도는 보통 허용 URL 기반 인증이 필요해 file:// 환경에서 차단될 수 있습니다."
    );
    return;
  }

  const auth = await validateNaverMapAuth();
  if (!auth.ok) {
    showStatus(
      `인증 실패 [${auth.errorCode || "UNKNOWN"}] ${auth.message || ""} ${auth.details || ""}`.trim()
    );
    return;
  }

  if (window.naver && window.naver.maps) {
    initMap();
    return;
  }

  showStatus("네이버 지도 스크립트를 불러오지 못했습니다. 사내망/방화벽 또는 Client ID 설정을 확인하세요.");
  window.addEventListener("load", () => {
    if (window.naver && window.naver.maps) {
      initMap();
    }
  });
}

boot();
