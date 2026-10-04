// script.js
document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("macro-grid");
    const btnSelectAll = document.getElementById("btn-select-all");
    const btnClear = document.getElementById("btn-clear");
    const btnDownload = document.getElementById("btn-download");

    let manifestData = [];

    // Fetch the parsed JSON manifest
    fetch("manifest.json")
        .then(response => {
            if (!response.ok) throw new Error("Manifest not found");
            return response.json();
        })
        .then(data => {
            manifestData = data;
            renderCards(data);
        })
        .catch(error => {
            console.error("Error loading macros:", error);
            grid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--accent-pink);">No macros found. Ensure the GitHub Action has run and generated manifest.json.</p>`;
        });

    function renderCards(data) {
        grid.innerHTML = "";
        data.forEach((fileObj, fileIndex) => {
            const card = document.createElement("div");
            card.className = "card";
            card.dataset.filename = fileObj.filename;
            card.dataset.fileindex = fileIndex;
            
            // Build the HTML for the macros contained in this file
            let macrosHtml = "";
            fileObj.macros.forEach((macro, macroIndex) => {
                macrosHtml += `
                    <li class="macro-item" data-macroindex="${macroIndex}">
                        <div class="macro-item-header">
                            <span class="macro-name">${macro.name}</span>
                            <span class="checkbox"></span>
                        </div>
                        <div class="macro-desc">${macro.description}</div>
                    </li>
                `;
            });

            card.innerHTML = `
                <div class="card-title" title="Click to select/deselect all in this category">
                    ${fileObj.filename}
                    <span class="icon">📄</span>
                </div>
                <ul class="macro-list">
                    ${macrosHtml}
                </ul>
            `;

            // Event listener for category (Select All/Deselect All inside this card)
            const cardTitle = card.querySelector(".card-title");
            const macroItems = card.querySelectorAll(".macro-item");
            
            cardTitle.addEventListener("click", () => {
                const allSelected = Array.from(macroItems).every(item => item.classList.contains("selected"));
                macroItems.forEach(item => {
                    if (allSelected) {
                        item.classList.remove("selected");
                    } else {
                        item.classList.add("selected");
                    }
                });
                updateCardSelectionState(card, macroItems);
            });

            // Event listener for individual macros
            macroItems.forEach(item => {
                item.addEventListener("click", () => {
                    item.classList.toggle("selected");
                    updateCardSelectionState(card, macroItems);
                });
            });

            grid.appendChild(card);
        });
    }

    function updateCardSelectionState(card, macroItems) {
        const anySelected = Array.from(macroItems).some(item => item.classList.contains("selected"));
        if (anySelected) {
            card.classList.add("has-selection");
        } else {
            card.classList.remove("has-selection");
        }
    }

    // Button event listeners
    btnSelectAll.addEventListener("click", () => {
        document.querySelectorAll(".macro-item").forEach(item => item.classList.add("selected"));
        document.querySelectorAll(".card").forEach(card => card.classList.add("has-selection"));
    });

    btnClear.addEventListener("click", () => {
        document.querySelectorAll(".macro-item").forEach(item => item.classList.remove("selected"));
        document.querySelectorAll(".card").forEach(card => card.classList.remove("has-selection"));
    });

    btnDownload.addEventListener("click", async () => {
        const selectedItems = document.querySelectorAll(".macro-item.selected");
        if (selectedItems.length === 0) {
            alert("Please select at least one macro to download.");
            return;
        }

        const zip = new JSZip();
        
        // Build detailed instructions inside MacroBase.cfg
        let masterIncludeText = "# =====================================================\n";
        masterIncludeText += "# KANROG CREATIONS - MACROBASE CONFIGURATION\n";
        masterIncludeText += "# =====================================================\n";
        masterIncludeText += "# HOW TO USE:\n";
        masterIncludeText += "# 1. Upload all extracted .cfg files (including this MacroBase.cfg file)\n";
        masterIncludeText += "#    directly into your Klipper configuration directory via Mainsail/Fluidd.\n";
        masterIncludeText += "# 2. Add the following line to your main printer.cfg file:\n";
        masterIncludeText += "#    [include MacroBase.cfg]\n";
        masterIncludeText += "# 3. To disable any individual macro file below, simply comment it out\n";
        masterIncludeText += "#    by placing a '#' at the beginning of the include line.\n";
        masterIncludeText += "# =====================================================\n\n";

        // Change button state to show progress
        const originalText = btnDownload.innerText;
        btnDownload.innerText = "Zipping...";
        btnDownload.disabled = true;

        try {
            // Loop over our manifest data to maintain file structures
            manifestData.forEach((fileObj, fileIndex) => {
                // Find which macros are selected in the DOM for this file
                const card = document.querySelector(`.card[data-fileindex="${fileIndex}"]`);
                if (!card) return;

                const selectedMacroElements = card.querySelectorAll(".macro-item.selected");
                if (selectedMacroElements.length === 0) return; // Skip file entirely if no macros are selected

                // Start assembling the file with its original header instructions
                let fileContent = fileObj.file_header ? fileObj.file_header + "\n\n" : "";
                
                // Append only the selected G-code blocks
                selectedMacroElements.forEach(el => {
                    const macroIndex = el.dataset.macroindex;
                    fileContent += fileObj.macros[macroIndex].raw_code;
                });

                // Add the assembled .cfg directly to the zip root (flattened)
                zip.file(fileObj.filename, fileContent);
                
                // Add to the master include text referencing the root filename
                masterIncludeText += `[include ${fileObj.filename}]\n`;
            });

            // Add the master MacroBase.cfg to the zip root
            zip.file("MacroBase.cfg", masterIncludeText);

            // Generate and trigger download
            const blob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "kanrog_macros.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error("Download failed:", error);
            alert("An error occurred while generating the ZIP file.");
        } finally {
            // Restore button
            btnDownload.innerText = originalText;
            btnDownload.disabled = false;
        }
    });
});