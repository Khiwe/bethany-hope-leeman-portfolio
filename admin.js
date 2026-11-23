/* Picture Studio Manager (admin.js) — mounted inside the central portfolio app (index.html).
   Mirrors the Bethany Snail Mail (Terra Club) admin.js module structure while providing:
   - 1-click computer photo upload & multi-photo grid insertion
   - Drag & drop onto any artwork space
   - Visual 51-Picture Portfolio Library modal
   - Natural aspect-ratio engine & 90° rotation
   - Automatic saving to localStorage + IndexedDB + direct HTML file overwrite */
(function () {
  let activeTargetSlotId = null;
  let activeTargetGridName = null;
  let lastExportedHTMLContent = '';
  let lastExportedBlobUrl = '';

  async function linkHTMLFileForDirectAutoSave() {
    if (!window.showSaveFilePicker) {
      await exportPortfolioHTML();
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'index.html',
        types: [{
          description: 'HTML Portfolio File',
          accept: { 'text/html': ['.html', '.htm'] }
        }]
      });
      if (handle) {
        await window.DB.saveLinkedFileHandleToDB(handle);
        const linkBtn = document.getElementById('studio-link-file-btn');
        if (linkBtn) {
          linkBtn.textContent = '✓ Direct File Auto-Save: ACTIVE';
          linkBtn.style.background = '#4ADE80';
        }
        await autoSaveToDisk();
      }
    } catch (e) {}
  }

  async function removeSlotFromPortfolio(slotId) {
    const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (!slotEl || slotId === 'hero-main') return;
    slotEl.remove();
    const states = await window.DB.loadAllSlotStates();
    const removed = Array.isArray(states.__removed_slots__) ? states.__removed_slots__ : [];
    if (!removed.includes(slotId)) {
      removed.push(slotId);
      await window.DB.saveSlotState('__removed_slots__', removed);
    }
    await autoSaveToDisk();
  }

  async function resetSavedPictures() {
    if (!confirm('Reset any custom picture changes saved in your browser back to the default portfolio layout?')) return;
    await window.DB.clearAllSavedStates();
    location.reload();
  }

  function extractImageFileName(src) {
    if (!src || src.indexOf('data:image/') === 0) return null;
    const parts = src.split('/');
    return parts[parts.length - 1] || null;
  }

  function ensureNaturalAspectRatio(slotEl) {
    if (!slotEl) return;
    const slotId = slotEl.getAttribute('data-slot-id');
    const img = slotEl.querySelector('img');
    if (!img) return;

    if (slotId !== 'hero-main') {
      img.classList.remove('aspect-[3/4]', 'aspect-[4/5]', 'aspect-[16/10]', 'aspect-[21/7]', 'h-full', 'object-cover');
      img.classList.add('w-full', 'h-auto', 'object-contain');
    }

    const updateBoxForRotation = () => {
      const nw = img.naturalWidth || 0;
      const nh = img.naturalHeight || 0;
      if (!nw || !nh) {
        if (slotId !== 'hero-main') slotEl.classList.add('slot-unloaded');
        return;
      }
      slotEl.classList.remove('slot-unloaded');

      if (slotId === 'hero-main') {
        if (img.dataset.customUploaded === 'true') {
          img.classList.remove('object-cover');
          img.classList.add('object-contain');
        }
        return;
      }

      const rot = ((parseInt(img.dataset.rotation || '0', 10) % 360) + 360) % 360;
      if (rot === 90 || rot === 270) {
        slotEl.style.setProperty('aspect-ratio', `${nh} / ${nw}`, 'important');
        slotEl.style.display = 'flex';
        slotEl.style.alignItems = 'center';
        slotEl.style.justifyContent = 'center';
        const scale = Math.min(nh / nw, nw / nh);
        img.style.transformOrigin = 'center center';
        img.style.transform = `rotate(${rot}deg) scale(${scale})`;
      } else {
        slotEl.style.setProperty('aspect-ratio', 'auto');
        slotEl.style.display = '';
        slotEl.style.alignItems = '';
        slotEl.style.justifyContent = '';
        img.style.transform = rot ? `rotate(${rot}deg)` : '';
      }
    };

    if (img.complete && img.naturalWidth === 0) {
      // Image already failed before ensureNaturalAspectRatio attached onerror: trigger fallback immediately
      const curSrc = img.getAttribute('src') || '';
      const fileName = extractImageFileName(curSrc);
      const folders = (window.DB && window.DB.FALLBACK_IMAGE_FOLDERS) || [
        './images/',
        '../Bethany Hope Leeman — Portfolio 2026_files/images/',
        './Bethany Hope Leeman — Portfolio 2026_files/images/'
      ];
      if (fileName) {
        img.dataset.fallbackFolderIdx = '1';
        const candidate = folders[0] + fileName;
        img.setAttribute('src', candidate !== curSrc ? candidate : (folders[1] || './images/') + fileName);
      }
    } else if (img.complete && img.naturalWidth > 0) {
      updateBoxForRotation();
    } else if (slotId !== 'hero-main') {
      slotEl.classList.add('slot-unloaded');
    }
    img.onload = updateBoxForRotation;
    img.onerror = () => {
      const curSrc = img.getAttribute('src') || '';
      const fileName = extractImageFileName(curSrc);
      const triedIdx = parseInt(img.dataset.fallbackFolderIdx || '0', 10);
      const folders = (window.DB && window.DB.FALLBACK_IMAGE_FOLDERS) || [
        '../Bethany Hope Leeman — Portfolio 2026_files/images/',
        './Bethany Hope Leeman — Portfolio 2026_files/images/',
        './images/'
      ];
      if (fileName && triedIdx < folders.length) {
        img.dataset.fallbackFolderIdx = String(triedIdx + 1);
        const candidate = folders[triedIdx] + fileName;
        if (candidate !== curSrc) {
          img.setAttribute('src', candidate);
          return;
        } else if (triedIdx + 1 < folders.length) {
          img.dataset.fallbackFolderIdx = String(triedIdx + 2);
          img.setAttribute('src', folders[triedIdx + 1] + fileName);
          return;
        }
      }
      if (img.dataset.fallbackSrc && img.dataset.fallbackSrc !== curSrc) {
        img.setAttribute('src', img.dataset.fallbackSrc);
        return;
      }
      if (slotId !== 'hero-main') slotEl.classList.add('slot-unloaded');
    };
  }

  function applyStateToSlot(slotEl, state) {
    if (!slotEl || !state) return;
    const img = slotEl.querySelector('img');
    if (!img) return;
    const currentHtmlSrc = img.getAttribute('src') || '';
    if (currentHtmlSrc.indexOf('data:image/') === 0 && !img.dataset.fallbackSrc) {
      img.dataset.fallbackSrc = currentHtmlSrc;
    }
    if (state.src) {
      if (currentHtmlSrc.indexOf('data:image/') === 0 && state.src.indexOf('data:image/') !== 0) {
        // Keep embedded base64 photo if saved state was an older relative path
      } else {
        img.dataset.customUploaded = 'true';
        img.setAttribute('src', state.src);
      }
    }
    if (typeof state.rotation === 'number') {
      img.dataset.rotation = String(state.rotation);
    }
    if (state.fit) {
      img.dataset.fit = state.fit;
      img.style.objectFit = state.fit;
    }
    ensureNaturalAspectRatio(slotEl);
  }

  function getSlotState(slotEl) {
    const img = slotEl.querySelector('img');
    return {
      src: img ? img.getAttribute('src') : '',
      rotation: img ? parseInt(img.dataset.rotation || '0', 10) : 0,
      fit: img ? (img.dataset.fit || 'contain') : 'contain'
    };
  }

  function decorateSlot(slotEl) {
    if (!slotEl || slotEl.querySelector('.slot-studio-overlay')) return;
    const slotId = slotEl.getAttribute('data-slot-id');
    ensureNaturalAspectRatio(slotEl);

    const bar = document.createElement('div');
    bar.className = 'slot-quick-bar';
    bar.setAttribute('data-studio-ui', 'true');
    bar.innerHTML = `
      <button type="button" class="slot-quick-badge primary-upload" onclick="event.stopPropagation(); promptUploadForSlot('${slotId}')" title="Upload photo(s) from your computer">↑ Upload Photo</button>
      <button type="button" class="slot-quick-badge" onclick="event.stopPropagation(); openLibraryModal('${slotId}')" title="Pick from the 51 portfolio pictures">⊞ 51 Pictures</button>
      <button type="button" class="slot-quick-badge" onclick="event.stopPropagation(); rotateSlotImage('${slotId}')" title="Rotate 90°">↻</button>
      ${slotId !== 'hero-main' ? `<button type="button" class="slot-quick-badge" onclick="event.stopPropagation(); removeSlotFromPortfolio('${slotId}')" title="Remove this picture space">×</button>` : ''}
    `;
    slotEl.appendChild(bar);

    const overlay = document.createElement('div');
    overlay.className = 'slot-studio-overlay';
    overlay.setAttribute('data-studio-ui', 'true');
    overlay.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        <button type="button" class="studio-btn" style="background:#1C1B1A;color:#FAF8F6;font-weight:500;" onclick="event.stopPropagation(); promptUploadForSlot('${slotId}')">↑ Upload Photo From Computer</button>
        <button type="button" class="studio-btn" onclick="event.stopPropagation(); openLibraryModal('${slotId}')">Choose From 51 Pictures</button>
      </div>
      <div style="display:flex;gap:6px;justify-content:center;">
        <button type="button" class="studio-btn" onclick="event.stopPropagation(); rotateSlotImage('${slotId}')" title="Rotate 90°">↻ Rotate 90°</button>
      </div>
      <span style="font-family:'Inter',sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#FAF8F6;opacity:0.95;margin-top:2px;">Click anywhere on this space or drag &amp; drop photo(s) here</span>
    `;
    slotEl.appendChild(overlay);

    slotEl.addEventListener('click', (e) => {
      if (document.body.classList.contains('studio-preview-only')) return;
      if (e.target.closest('button')) return;
      e.preventDefault();
      e.stopPropagation();
      promptUploadForSlot(slotId);
    });

    slotEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      slotEl.classList.add('drag-over');
    });
    slotEl.addEventListener('dragleave', () => {
      slotEl.classList.remove('drag-over');
    });
    slotEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      slotEl.classList.remove('drag-over');
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        await handleFilesForSlotOrGrid(slotId, null, Array.from(files));
        return;
      }
      const draggedUrl = e.dataTransfer.getData('text/plain');
      if (draggedUrl) {
        await setSlotImage(slotId, draggedUrl);
      }
    });
  }

  function flashAutoSaveConfirmation(savedDirectlyToFile) {
    const saveBtn = document.getElementById('studio-save-btn');
    if (saveBtn) {
      saveBtn.textContent = savedDirectlyToFile
        ? '✓ Auto-Saved Directly to HTML File!'
        : '✓ Auto-Saved! (Click to Save HTML File)';
      saveBtn.style.background = '#4ADE80';
      saveBtn.style.color = '#1C1B1A';
    }

    let badge = document.getElementById('studio-autosave-pill');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'studio-autosave-pill';
      badge.setAttribute('data-studio-ui', 'true');
      badge.style.cssText = 'position:fixed;top:18px;right:20px;z-index:580;background:#1C1B1A;color:#FAF8F6;padding:10px 16px;box-shadow:0 12px 30px rgba(0,0,0,0.35);border:1px solid #4ADE80;font-family:Inter,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;display:flex;align-items:center;gap:10px;transition:opacity 0.25s ease;';
      document.body.appendChild(badge);
    }
    badge.style.opacity = '1';
    badge.innerHTML = `
      <span style="color:#4ADE80;font-weight:700;">✓ Picture Saved Automatically</span>
      ${!savedDirectlyToFile && window.showSaveFilePicker
        ? `<button type="button" onclick="linkHTMLFileForDirectAutoSave()" style="background:#4ADE80;color:#1C1B1A;padding:4px 8px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border:none;">Link HTML File Once</button>`
        : ''}
    `;
    clearTimeout(window.__autoSavePillTimer);
    window.__autoSavePillTimer = setTimeout(() => {
      if (badge) badge.style.opacity = '0';
    }, 3800);
  }

  async function setSlotImage(slotId, newSrc, skipDiskAutoSave) {
    const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (!slotEl) return;
    const img = slotEl.querySelector('img');
    if (img) {
      img.dataset.rotation = '0';
      img.dataset.customUploaded = 'true';
      img.style.transform = '';
      img.setAttribute('src', newSrc);
      ensureNaturalAspectRatio(slotEl);
      await window.DB.saveSlotState(slotId, getSlotState(slotEl));
      if (!skipDiskAutoSave) {
        await autoSaveToDisk();
      }
    }
  }

  async function rotateSlotImage(slotId) {
    const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (!slotEl) return;
    const img = slotEl.querySelector('img');
    if (!img) return;

    try {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (nw && nh) {
        const canvas = document.createElement('canvas');
        canvas.width = nh;
        canvas.height = nw;
        const ctx = canvas.getContext('2d');
        ctx.translate(nh / 2, nw / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -nw / 2, -nh / 2);
        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        img.dataset.rotation = '0';
        img.style.transform = '';
        img.setAttribute('src', rotatedDataUrl);
        ensureNaturalAspectRatio(slotEl);
        await window.DB.saveSlotState(slotId, getSlotState(slotEl));
        await autoSaveToDisk();
        return;
      }
    } catch (err) {}

    const current = parseInt(img.dataset.rotation || '0', 10);
    const next = (current + 90) % 360;
    img.dataset.rotation = String(next);
    ensureNaturalAspectRatio(slotEl);
    await window.DB.saveSlotState(slotId, getSlotState(slotEl));
    await autoSaveToDisk();
  }

  function promptUploadForSlot(slotId) {
    activeTargetSlotId = slotId;
    activeTargetGridName = null;
    const input = document.getElementById('studio-file-input');
    input.value = '';
    input.click();
  }

  function promptUploadForGrid(gridName) {
    activeTargetSlotId = null;
    activeTargetGridName = gridName;
    const input = document.getElementById('studio-file-input');
    input.value = '';
    input.click();
  }

  function triggerFileUploadForActiveSlot() {
    const input = document.getElementById('studio-file-input');
    input.value = '';
    input.click();
  }

  function optimizeImageFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawDataUrl = ev.target.result;
        const tempImg = new Image();
        tempImg.onload = () => {
          const nw = tempImg.naturalWidth || tempImg.width;
          const nh = tempImg.naturalHeight || tempImg.height;
          const maxDim = 1600;
          if (!nw || !nh) {
            resolve(rawDataUrl);
            return;
          }
          const scale = Math.min(maxDim / nw, maxDim / nh, 1);
          const targetW = Math.round(nw * scale);
          const targetH = Math.round(nh * scale);
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(tempImg, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        tempImg.onerror = () => resolve(rawDataUrl);
        tempImg.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  function createSlotElementInGrid(gridName, slotId, initialSrc) {
    const grid = document.querySelector(`[data-gallery-grid="${gridName}"]`);
    if (!grid) return null;
    let existing = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (existing) return existing;

    const addBtn = grid.querySelector('.studio-add-slot-card');
    const wrapper = document.createElement('div');
    wrapper.className = 'overflow-hidden bg-stone-100 cursor-pointer';
    wrapper.setAttribute('data-slot-id', slotId);
    wrapper.setAttribute('data-custom-grid', gridName);
    const srcToUse = initialSrc || `${window.DB.IMAGE_FOLDER}img_02.png`;
    wrapper.setAttribute('onclick', `openLightbox('${window.DB.IMAGE_FOLDER}img_02.png', 'Bethany Hope Leeman — Portfolio 2026')`);
    wrapper.innerHTML = `<img src="${srcToUse}" alt="Portfolio artwork" class="w-full h-auto object-contain artwork-frame">`;
    if (addBtn) {
      grid.insertBefore(wrapper, addBtn);
    } else {
      grid.appendChild(wrapper);
    }
    decorateSlot(wrapper);
    return wrapper;
  }

  async function handleFilesForSlotOrGrid(slotId, gridName, files) {
    const imageFiles = files.filter(f => f && f.type && f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    closeLibraryModal();

    let targetGrid = gridName;
    if (!targetGrid && slotId) {
      const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
      const parentGrid = slotEl && slotEl.closest ? slotEl.closest('[data-gallery-grid]') : null;
      if (parentGrid) targetGrid = parentGrid.getAttribute('data-gallery-grid');
    }

    for (let i = 0; i < imageFiles.length; i++) {
      const dataUrl = await optimizeImageFile(imageFiles[i]);
      if (i === 0 && slotId) {
        await setSlotImage(slotId, dataUrl, true);
      } else if (targetGrid) {
        const newSlotId = 'slot-custom-' + Date.now() + '-' + i;
        createSlotElementInGrid(targetGrid, newSlotId, dataUrl);
        await window.DB.registerCustomSlotInDB(newSlotId, targetGrid);
        await setSlotImage(newSlotId, dataUrl, true);
      }
    }

    await autoSaveToDisk();
  }

  function openLibraryModal(slotId) {
    activeTargetSlotId = slotId;
    const modal = document.getElementById('studio-picker-modal');
    const title = document.getElementById('studio-modal-title');
    title.textContent = slotId
      ? `Choose a picture for space [${slotId}] — click any image below`
      : 'All 51 Portfolio Pictures — click any space on the page to upload or place';
    const grid = document.getElementById('studio-library-grid');
    if (!grid.children.length) {
      window.DB.PORTFOLIO_IMAGES.forEach((fileName, idx) => {
        const fullPath = window.DB.IMAGE_FOLDER + fileName;
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid #E7E5E4;background:#fff;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.15s ease,box-shadow 0.15s ease;';
        card.innerHTML = `
          <div style="aspect-ratio:1/1;background:#F5F5F4;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:4px;">
            <img src="${fullPath}" alt="${fileName}" loading="lazy" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;">
          </div>
          <div style="padding:6px 8px;display:flex;justify-content:space-between;align-items:center;font-family:'Inter',sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#6E6A66;">
            <span>#${String(idx + 1).padStart(2, '0')}</span>
            <span>${fileName}</span>
          </div>
        `;
        const thumbImg = card.querySelector('img');
        if (thumbImg) {
          thumbImg.onerror = () => {
            if (!thumbImg.dataset.triedFallback) {
              thumbImg.dataset.triedFallback = '1';
              thumbImg.src = './Bethany Hope Leeman — Portfolio 2026_files/images/' + fileName;
            } else if (thumbImg.dataset.triedFallback === '1') {
              thumbImg.dataset.triedFallback = '2';
              thumbImg.src = './images/' + fileName;
            }
          };
        }
        card.addEventListener('click', async () => {
          const resolvedSrc = (thumbImg && thumbImg.getAttribute('src')) || fullPath;
          if (activeTargetSlotId) {
            await setSlotImage(activeTargetSlotId, resolvedSrc);
            closeLibraryModal();
          } else {
            window.openLightbox(resolvedSrc, fileName);
          }
        });
        grid.appendChild(card);
      });
    }
    modal.style.display = 'flex';
  }

  function closeLibraryModal() {
    const modal = document.getElementById('studio-picker-modal');
    if (modal) modal.style.display = 'none';
  }

  function addNewPictureSlot(gridName) {
    promptUploadForGrid(gridName);
  }

  function toggleStudioEditMode() {
    const isPreviewOnly = document.body.classList.toggle('studio-preview-only');
    const toggleBtn = document.getElementById('studio-toggle-btn');
    toggleBtn.textContent = isPreviewOnly ? '✎ Turn On Picture Tools' : '✓ Easy Picture Mode: ON';
    toggleBtn.style.background = isPreviewOnly ? '#EBDCE0' : '#4ADE80';
  }

  async function buildCleanExportHTML() {
    const savedStates = await window.DB.loadAllSlotStates();
    Object.keys(savedStates).forEach((slotId) => {
      if (slotId.startsWith('__')) return;
      const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
      if (slotEl) applyStateToSlot(slotEl, savedStates[slotId]);
    });

    const clone = document.documentElement.cloneNode(true);
    const cloneBody = clone.querySelector('body');
    if (cloneBody) {
      cloneBody.classList.remove('studio-edit-mode');
      cloneBody.classList.add('studio-preview-only');
    }

    clone.querySelectorAll('.slot-studio-overlay, .slot-quick-bar, .slot-quick-badge, .studio-add-slot-card, #__live_reload, #studio-save-toast, #studio-autosave-pill, #studio-auth-modal, .studio-download-anchor').forEach(el => el.remove());
    clone.querySelectorAll('.slot-unloaded').forEach(el => el.classList.remove('slot-unloaded'));

    const cloneToolbar = clone.querySelector('#studio-toolbar');
    if (cloneToolbar) cloneToolbar.style.display = 'none';

    const cloneModal = clone.querySelector('#studio-picker-modal');
    if (cloneModal) cloneModal.style.display = 'none';
    const cloneGrid = clone.querySelector('#studio-library-grid');
    if (cloneGrid) cloneGrid.innerHTML = '';
    const cloneLightbox = clone.querySelector('#lightbox');
    if (cloneLightbox) {
      cloneLightbox.classList.add('hidden');
      cloneLightbox.classList.remove('flex');
    }

    clone.querySelectorAll('[data-page-view]').forEach((pageEl) => {
      pageEl.style.display = (pageEl.getAttribute('data-page-view') === 'home') ? 'block' : 'none';
    });
    clone.querySelectorAll('[data-work-series]').forEach((article) => {
      article.style.display = '';
    });
    const cloneHeader = clone.querySelector('#main-header');
    if (cloneHeader) {
      cloneHeader.className = 'absolute top-0 left-0 right-0 w-full z-[400] bg-transparent transition-all duration-300';
      cloneHeader.style.background = '';
      cloneHeader.style.borderBottom = '';
    }
    const cloneSaveBtn = clone.querySelector('#studio-save-btn');
    if (cloneSaveBtn) {
      cloneSaveBtn.textContent = '✓ Auto-Save: ON';
      cloneSaveBtn.style.background = '#4ADE80';
    }

    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  async function tryWriteViaFileHandle(htmlContent) {
    try {
      const handle = await window.DB.loadLinkedFileHandleFromDB();
      if (!handle) return false;
      if (handle.queryPermission) {
        let perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted' && handle.requestPermission) {
          perm = await handle.requestPermission({ mode: 'readwrite' });
        }
        if (perm !== 'granted') return false;
      }
      const writable = await handle.createWritable();
      await writable.write(htmlContent);
      await writable.close();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function autoSaveToDisk() {
    try {
      window.__suppressLiveReloadUntil = Date.now() + 5000;
      const htmlContent = await buildCleanExportHTML();
      lastExportedHTMLContent = htmlContent;

      let savedOnDisk = false;

      // 1. Try writing directly to linked local HTML file via Browser File System Access API
      savedOnDisk = await tryWriteViaFileHandle(htmlContent);

      // 2. Try writing via local auto-save server endpoints if running
      if (!savedOnDisk) {
        const endpoints = [
          'http://localhost:8001/__save_html',
          'http://127.0.0.1:8001/__save_html',
          '/__save_html'
        ];
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'text/html;charset=utf-8' },
              body: htmlContent
            });
            if (res && res.ok) {
              savedOnDisk = true;
              break;
            }
          } catch (e) {}
        }
      }

      const linkBtn = document.getElementById('studio-link-file-btn');
      if (linkBtn) {
        if (savedOnDisk) {
          linkBtn.style.display = 'none';
        } else if (window.showSaveFilePicker) {
          linkBtn.style.display = 'inline-block';
        }
      }

      flashAutoSaveConfirmation(savedOnDisk);
      return savedOnDisk;
    } catch (e) {
      flashAutoSaveConfirmation(false);
      return false;
    }
  }

  function showSaveToast(blobUrl, savedOnDisk) {
    const existing = document.getElementById('studio-save-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'studio-save-toast';
    toast.setAttribute('data-studio-ui', 'true');
    toast.style.cssText = 'position:fixed;bottom:76px;right:20px;z-index:560;background:#1C1B1A;color:#FAF8F6;padding:16px 20px;box-shadow:0 20px 45px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.2);max-width:440px;font-family:Inter,sans-serif;';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
        <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#4ADE80;font-weight:600;">
          ${savedOnDisk ? '✓ Auto-Saved Directly to Your HTML File!' : '✓ All Pictures Auto-Saved in Browser'}
        </span>
        <button type="button" onclick="document.getElementById('studio-save-toast').remove()" style="font-size:11px;color:rgba(255,255,255,0.7);cursor:pointer;background:none;border:none;">[×]</button>
      </div>
      <p style="font-size:12px;line-height:1.5;color:rgba(250,248,246,0.85);margin-bottom:12px;">
        ${savedOnDisk
          ? 'Every picture you added is already saved directly inside <strong>index.html</strong>.'
          : 'Your added pictures are automatically saved in this browser whenever you upload them. You can also download the updated HTML file below:'}
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <a href="${blobUrl}" download="index.html" style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;padding:9px 14px;background:#4ADE80;color:#1C1B1A;font-weight:600;text-decoration:none;display:inline-block;cursor:pointer;">
          ↓ Download Updated index.html
        </a>
        ${window.showSaveFilePicker && !savedOnDisk
          ? `<button type="button" onclick="linkHTMLFileForDirectAutoSave()" style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;padding:9px 14px;background:#FAF8F6;color:#1C1B1A;font-weight:600;border:none;cursor:pointer;">⚡ Link File for Auto-Overwrite</button>`
          : ''}
      </div>
    `;
    document.body.appendChild(toast);
  }

  async function exportPortfolioHTML() {
    const saveBtn = document.getElementById('studio-save-btn');
    if (saveBtn) saveBtn.textContent = '⏳ Saving...';

    const savedOnDisk = await autoSaveToDisk();
    const htmlContent = lastExportedHTMLContent || await buildCleanExportHTML();

    if (lastExportedBlobUrl) {
      try { URL.revokeObjectURL(lastExportedBlobUrl); } catch (e) {}
    }
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    lastExportedBlobUrl = blobUrl;

    if (!savedOnDisk) {
      const tempLink = document.createElement('a');
      tempLink.className = 'studio-download-anchor';
      tempLink.href = blobUrl;
      tempLink.download = 'index.html';
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
    }

    showSaveToast(blobUrl, savedOnDisk);
  }

  const STUDIO_SESSION_KEY = 'bethany_studio_unlocked';
  let studioControlsMounted = false;

  function isStudioUnlocked() {
    try {
      return sessionStorage.getItem(STUDIO_SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  async function mountStudioControls() {
    document.body.classList.remove('studio-preview-only');
    const toolbar = document.getElementById('studio-toolbar');
    if (toolbar) toolbar.style.display = 'flex';

    const toggleBtn = document.getElementById('studio-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = '✓ Easy Picture Mode: ON';
      toggleBtn.style.background = '#4ADE80';
    }

    if (!studioControlsMounted) {
      studioControlsMounted = true;
      document.querySelectorAll('[data-slot-id]').forEach(decorateSlot);
      document.querySelectorAll('[data-gallery-grid]').forEach((grid) => {
        const gridName = grid.getAttribute('data-gallery-grid');
        if (grid.querySelector('.studio-add-slot-card')) return;
        const addCard = document.createElement('div');
        addCard.className = 'studio-add-slot-card';
        addCard.setAttribute('data-studio-ui', 'true');
        addCard.onclick = () => addNewPictureSlot(gridName);
        addCard.innerHTML = `
          <span style="font-size:28px;line-height:1;color:#1C1B1A;">+</span>
          <span style="font-family:'Inter',sans-serif;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#1C1B1A;">Add &amp; Upload New Pictures</span>
          <span style="font-family:'Inter',sans-serif;font-size:10px;color:#6E6A66;">(Select 1 or multiple photos)</span>
        `;
        grid.appendChild(addCard);
      });

      const existingHandle = await window.DB.loadLinkedFileHandleFromDB();
      const linkBtn = document.getElementById('studio-link-file-btn');
      if (linkBtn && window.showSaveFilePicker) {
        linkBtn.style.display = 'inline-block';
        if (existingHandle) {
          linkBtn.textContent = '✓ Direct File Auto-Save: Ready';
          linkBtn.style.background = '#4ADE80';
        }
      }
    }
  }

  function exitStudioAdmin() {
    try { sessionStorage.removeItem(STUDIO_SESSION_KEY); } catch (e) {}
    document.body.classList.add('studio-preview-only');
    const toolbar = document.getElementById('studio-toolbar');
    if (toolbar) toolbar.style.display = 'none';
    const toast = document.getElementById('studio-save-toast');
    if (toast) toast.remove();
    const pill = document.getElementById('studio-autosave-pill');
    if (pill) pill.remove();
    if (location.hash === '#admin' || location.hash === '#/admin') {
      if (history.replaceState) history.replaceState(null, '', '#home');
    }
  }

  function openStudioAdmin() {
    if (isStudioUnlocked()) {
      mountStudioControls();
      return;
    }

    const existingModal = document.getElementById('studio-auth-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'studio-auth-modal';
    modal.setAttribute('data-studio-ui', 'true');
    modal.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(20,19,18,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.onclick = () => modal.remove();

    modal.innerHTML = `
      <form id="studio-auth-form" onclick="event.stopPropagation()" style="background:#FAF8F6;color:#1C1B1A;width:100%;max-width:400px;padding:32px;border:1px solid #E7E5E4;box-shadow:0 24px 60px rgba(0,0,0,0.4);font-family:'Inter',sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#6E6A66;">Private Dashboard</span>
          <button type="button" id="studio-auth-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#6E6A66;">×</button>
        </div>
        <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:400;margin-bottom:6px;">Studio Admin</h3>
        <p style="font-size:12px;color:#6E6A66;line-height:1.5;margin-bottom:18px;">
          Enter your studio passcode to upload, rotate, or arrange artworks. Public visitors only see the view-only portfolio.
        </p>
        <label style="display:block;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#6E6A66;margin-bottom:6px;">
          Studio Passcode
        </label>
        <input id="studio-passcode-input" type="password" required autocomplete="current-password" placeholder="Enter passcode…" style="width:100%;padding:10px 12px;border:1px solid #D6D3D1;background:#fff;font-size:14px;color:#1C1B1A;margin-bottom:10px;"/>
        <p id="studio-auth-err" style="font-size:12px;color:#B91C1C;min-height:18px;margin-bottom:12px;"></p>
        <button type="submit" style="width:100%;padding:12px;background:#1C1B1A;color:#FAF8F6;border:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;">
          Unlock Studio Dashboard
        </button>
      </form>
    `;

    document.body.appendChild(modal);
    const input = document.getElementById('studio-passcode-input');
    const errEl = document.getElementById('studio-auth-err');
    document.getElementById('studio-auth-close').onclick = () => modal.remove();
    if (input) input.focus();

    document.getElementById('studio-auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const entered = (input.value || '').trim();
      const expected = String(window.STUDIO_PASSCODE || 'bethany2026');
      if (entered !== expected) {
        errEl.textContent = 'Incorrect passcode.';
        input.focus();
        return;
      }
      try { sessionStorage.setItem(STUDIO_SESSION_KEY, '1'); } catch (err) {}
      modal.remove();
      await mountStudioControls();
      if (window.switchPage && location.hash === '#admin') {
        window.switchPage('works');
      }
    };
  }

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
      e.preventDefault();
      openStudioAdmin();
    }
  });

  async function initPictureStudio() {
    // Default to clean public view-only portfolio on every load
    document.body.classList.add('studio-preview-only');
    const toolbar = document.getElementById('studio-toolbar');
    if (toolbar) toolbar.style.display = 'none';

    const fileInput = document.getElementById('studio-file-input');
    if (fileInput && !fileInput.dataset.boundStudio) {
      fileInput.dataset.boundStudio = '1';
      fileInput.addEventListener('change', async (e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (!files.length) return;
        await handleFilesForSlotOrGrid(activeTargetSlotId, activeTargetGridName, files);
      });
    }

    const savedStates = await window.DB.loadAllSlotStates();

    // 1. Remove any slots the user previously deleted
    if (Array.isArray(savedStates.__removed_slots__)) {
      savedStates.__removed_slots__.forEach((slotId) => {
        const el = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (el && slotId !== 'hero-main') el.remove();
      });
    }

    // 2. Recreate any custom added picture slots in their respective gallery grids
    if (Array.isArray(savedStates.__custom_slots__)) {
      savedStates.__custom_slots__.forEach(({ slotId, gridName }) => {
        if (Array.isArray(savedStates.__removed_slots__) && savedStates.__removed_slots__.includes(slotId)) return;
        const st = savedStates[slotId];
        createSlotElementInGrid(gridName, slotId, st && st.src ? st.src : `${window.DB.IMAGE_FOLDER}img_02.png`);
      });
    }

    // 3. Apply saved images & rotations to every slot for public viewing
    Object.keys(savedStates).forEach((slotId) => {
      if (slotId.startsWith('__')) return;
      const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
      if (slotEl) applyStateToSlot(slotEl, savedStates[slotId]);
    });
    document.querySelectorAll('[data-slot-id]').forEach(ensureNaturalAspectRatio);

    // 4. Only mount editing controls if Studio Admin is unlocked
    const initialHash = (location.hash || '').replace(/^#\/?/, '');
    if (isStudioUnlocked()) {
      await mountStudioControls();
    }

    if (initialHash === 'admin') {
      openStudioAdmin();
    } else if (['home', 'statement', 'works', 'archive', 'contact'].includes(initialHash) && window.switchPage) {
      window.switchPage(initialHash);
    }
  }

  // Expose functions globally for HTML onclick attributes and external callers
  window.mountAdmin = initPictureStudio;
  window.initPictureStudio = initPictureStudio;
  window.openStudioAdmin = openStudioAdmin;
  window.exitStudioAdmin = exitStudioAdmin;
  window.ensureNaturalAspectRatio = ensureNaturalAspectRatio;
  window.linkHTMLFileForDirectAutoSave = linkHTMLFileForDirectAutoSave;
  window.removeSlotFromPortfolio = removeSlotFromPortfolio;
  window.resetSavedPictures = resetSavedPictures;
  window.setSlotImage = setSlotImage;
  window.rotateSlotImage = rotateSlotImage;
  window.promptUploadForSlot = promptUploadForSlot;
  window.promptUploadForGrid = promptUploadForGrid;
  window.triggerFileUploadForActiveSlot = triggerFileUploadForActiveSlot;
  window.openLibraryModal = openLibraryModal;
  window.closeLibraryModal = closeLibraryModal;
  window.addNewPictureSlot = addNewPictureSlot;
  window.toggleStudioEditMode = toggleStudioEditMode;
  window.exportPortfolioHTML = exportPortfolioHTML;
  window.autoSaveToDisk = autoSaveToDisk;
})();
