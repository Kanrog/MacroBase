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
            grid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--accent-pink);">No macros found. Ensure manifest.json exists and the build action has run.</p>`;
        });

    function renderCards(data) {
        grid.innerHTML = "";
        data.forEach(fileObj => {
            const card = document.createElement("div");
            card.className = "card";
            card.dataset.filename = fileObj.filename;
            
            // Build the HTML for the macros contained in this file
            let macrosHtml = "";
            fileObj.macros.forEach(macro => {
                macrosHtml += `
                    <li class="macro-item">
                        <div class="macro-name">${macro.name}</div>
                        <div class="macro-desc">${macro.description}</div>
                    </li>
                `;
            });

            card.innerHTML = `
                <div class="card-title">
                    ${fileObj.filename}
                    <span class="icon">📄</span>
                </div>
                <ul class="macro-list">
                    ${macrosHtml}
                </ul>
            `;

            // Toggle selection on click
            card.addEventListener("click", () => {
                card.classList.toggle("selected");
            });

            grid.appendChild(card);
        });
    }

    // Button event listeners
    btnSelectAll.addEventListener("click", () => {
        document.querySelectorAll(".card").forEach(card => card.classList.add("selected"));
    });

    btnClear.addEventListener("click", () => {
        document.querySelectorAll(".card").forEach(card => card.classList.remove("selected"));
    });

    btnDownload.addEventListener("click", async () => {
        const selectedCards = document.querySelectorAll(".card.selected");
        if (selectedCards.length === 0) {
            alert("Please select at least one macro file to download.");
            return;
        }

const zip = new JSZip();
        let masterIncludeText = "# KANROG CREATIONS - MACROBASE\n";
        masterIncludeText += "# Include this file in your printer.cfg or comment out specific macro groups below as needed.\n\n";

        // Change button state to show progress
        const originalText = btnDownload.innerText;
        btnDownload.innerText = "Zipping...";
        btnDownload.disabled = true;

        try {
            for (const card of selectedCards) {
                const filename = card.dataset.filename;
                // Fetch the raw .cfg file from the macros folder
                const response = await fetch(`macros/${filename}`);
                if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
                
                const fileText = await response.text();
                
                // Add the .cfg to a subfolder inside the zip
                zip.file(`macros/${filename}`, fileText);
                
                // Add to the master include text referencing the subfolder path
                masterIncludeText += `[include macros/${filename}]\n`;
            }

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