// Huffman Node Class for building the tree
class HuffmanNode {
    constructor(char, freq, left = null, right = null) {
        this.char = char;
        this.freq = freq;
        this.left = left;
        this.right = right;
    }
}

// Main Huffman Coding implementation
class HuffmanCoding {
    constructor() {
        this.PSEUDO_EOF = '\uFFFF'; // a Unicode char
        this.reset();
    }

    reset() {
        this.root = null;
        this.codes = {};
        this.frequencyTable = {};
        this.originalText = "";
        this.compressedText = "";
        this.compressedBytes = null; // Store Uint8Array
    }

    // to build frequency table from input text
    buildFrequencyTable(text) {
        const freqTable = {};
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            freqTable[char] = (freqTable[char] || 0) + 1;
        }
        // Add pseudo-EOF marker
        freqTable[this.PSEUDO_EOF] = 1;
        this.frequencyTable = freqTable;
        return freqTable;
    }

    // to build the Huffman tree from frequency table
    buildHuffmanTree(freqTable) {
        //create huffmannode class for each character int the text
        const pq = Object.keys(freqTable).map(char => 
            new HuffmanNode(char, freqTable[char])
        );
        
        // Sort by frequency (ascending)
        pq.sort((a, b) => a.freq - b.freq);
        
        // Edge case: single character
        if (pq.length === 1) {
            this.root = new HuffmanNode(null, pq[0].freq);
            this.root.left = pq[0];
            return this.root;
        }
        
        // Build tree by combining nodes
        while (pq.length > 1) {
            // Get two nodes with lowest frequencies
            const left = pq.shift();
            const right = pq.shift();
            
            // Create parent node with combined frequency
            const parent = new HuffmanNode(null, left.freq + right.freq, left, right);
            
            // Find position to insert new node (keep sorted)
            let inserted = false;
            for (let i = 0; i < pq.length; i++) {
                if (parent.freq <= pq[i].freq) {
                    pq.splice(i, 0, parent);
                    inserted = true;
                    break;
                }
            }
            
            // If larger than all existing nodes, add to end
            if (!inserted) {
                pq.push(parent);
            }
        }
        
        this.root = pq[0];
        return this.root;
    }

    // Generate codes recursively by traversing the tree
    generateCodes(node = this.root, code = "") {
        if (!node) return;
        // base case
        if (node.char) {
            this.codes[node.char] = code || "0"; // Handle single character case
            return;
        }
        // Traverse left
        if (node.left) {
            this.generateCodes(node.left, code + "0");
        }
        // Traverse right
        if (node.right) {
            this.generateCodes(node.right, code + "1");
        }
    }

    // Encode text using generated codes
    encode(text) {
        this.reset();
        this.originalText = text;
        // Add pseudo-EOF
        const textWithEOF = text + this.PSEUDO_EOF;
        const freqTable = this.buildFrequencyTable(textWithEOF);
        this.buildHuffmanTree(freqTable);
        this.generateCodes();
        // Convert text to compressed binary string
        let bitString = "";
        for (let i = 0; i < textWithEOF.length; i++) {
            bitString += this.codes[textWithEOF[i]];
        }
        this.compressedText = bitString;
        // Pack bits into bytes
        const byteLength = Math.ceil(bitString.length / 8);
        const bytes = new Uint8Array(byteLength);
        for (let i = 0; i < bitString.length; i++) {
            const byteIndex = Math.floor(i / 8);
            const bitIndex = (i % 8);
            if (bitString[i] === '1') {
                bytes[byteIndex] |= (1 << bitIndex);
            }
        }
        this.compressedBytes = bytes;
        return bitString;
    }

    // Helper to unpack bits from bytes
    static bytesToBitString(bytes, bitLength) {
        let bits = "";
        for (let i = 0; i < bytes.length; i++) {
            let byte = bytes[i];
            for (let j = 0; j <= 7; j++) {
                bits += ((byte >> j) & 1) ? '1' : '0';
            }
        }
        return bitLength ? bits.slice(0, bitLength) : bits;
    }

    decodeFromBytes(bytes, bitLength) {
        const bitString = HuffmanCoding.bytesToBitString(bytes, bitLength);
        return this.decode(bitString, true);
    }

    // Decode compressed binary back to text
    decode(compressed, hasPseudoEOF = false) {
        if (!this.root) {
            throw new Error("No Huffman tree available. Please encode text first.");
        }
        let result = "";
        let current = this.root;
        // Handle single character case
        if (this.root.left && this.root.left.char && !this.root.right) {
            const char = this.root.left.char;
            return char.repeat(compressed.length);
        }
        for (let i = 0; i < compressed.length; i++) {
            const bit = compressed[i];
            current = bit === "0" ? current.left : current.right;
            if (current.char) {
                if (current.char === this.PSEUDO_EOF && hasPseudoEOF) break;
                result += current.char;
                current = this.root;
            }
        }
        return result;
    }

    // Calculate compression statistics
    getStatistics() {
        const original = this.originalText;
        const compressed = this.compressedText;
        if (!original || !compressed) {
            return {
                originalSize: 0,
                compressedSize: 0,
                compressionRatio: 0,
                spaceSaving: 0
            };
        }
        const originalSize = original.length * 8; // 8 bits per character
        const compressedSize = compressed.length;
        return {
            originalSize,
            compressedSize,
            compressionRatio: (originalSize / compressedSize).toFixed(2),
            spaceSaving: (((originalSize - compressedSize) / originalSize) * 100).toFixed(2),
            averageBitsPerChar: (compressedSize / original.length).toFixed(2)
        };
    }
}

// Initialize the Huffman coder
const huffman = new HuffmanCoding();

// UI-related code
document.addEventListener("DOMContentLoaded", function() {
    // Tab navigation
    const encodeTrigger = document.getElementById("encode-tab-btn");
    const decodeTrigger = document.getElementById("decode-tab-btn");
    const statsTrigger = document.getElementById("stats-tab-btn");
    
    const encodeContent = document.getElementById("encode-tab-content");
    const decodeContent = document.getElementById("decode-tab-content");
    const statsContent = document.getElementById("stats-tab-content");
    
    // Tab switching
    encodeTrigger.addEventListener("click", function() {
        activateTab(encodeTrigger, encodeContent);
    });
    
    decodeTrigger.addEventListener("click", function() {
        activateTab(decodeTrigger, decodeContent);
    });
    
    statsTrigger.addEventListener("click", function() {
        activateTab(statsTrigger, statsContent);
    });
    
    function activateTab(button, content) {
        // Deactivate all tabs
        [encodeTrigger, decodeTrigger, statsTrigger].forEach(btn => {
            btn.classList.remove("active");
        });
        
        [encodeContent, decodeContent, statsContent].forEach(cont => {
            cont.classList.remove("active");
        });
        
        // Activate selected tab
        button.classList.add("active");
        content.classList.add("active");
    }
    
    // Input handling
    const inputText = document.getElementById("input-text");
    const charCount = document.getElementById("char-count");
    const fileSize = document.getElementById("file-size");
    
    // Update stats on input
    inputText.addEventListener("input", function() {
        const text = inputText.value;
        const chars = text.length;
        const bytes = new Blob([text]).size;
        
        charCount.textContent = `${chars} characters`;
        fileSize.textContent = `${bytes} bytes`;
    });
    
    // File upload handling
    const fileInput = document.getElementById("file-input");
    const chooseFileBtn = document.getElementById("choose-file-btn");
    const fileDropZone = document.getElementById("file-drop-zone");
    
    chooseFileBtn.addEventListener("click", function() {
        fileInput.click();
    });
    
    fileInput.addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (file) {
            readFile(file);
        }
    });
    
    fileDropZone.addEventListener("dragover", function(e) {
        e.preventDefault();
        fileDropZone.classList.add("dragover");
    });
    
    fileDropZone.addEventListener("dragleave", function() {
        fileDropZone.classList.remove("dragover");
    });
    
    fileDropZone.addEventListener("drop", function(e) {
        e.preventDefault();
        fileDropZone.classList.remove("dragover");
        
        const file = e.dataTransfer.files[0];
        if (file && file.type === "text/plain") {
            readFile(file);
        } else {
            showError("Please drop a text file (.txt)");
        }
    });
    
    function readFile(file) {
        if (file.size > 1024 * 1024) { // 1MB limit
            showError("File size exceeds 1MB limit");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            inputText.value = e.target.result;
            // Trigger input event to update stats
            inputText.dispatchEvent(new Event("input"));
        };
        reader.onerror = function() {
            showError("Error reading file");
        };
        reader.readAsText(file);
    }
    
    // Compression
    const compressBtn = document.getElementById("compress-btn");
    const compressedOutput = document.getElementById("compressed-output");
    const encodeOutput = document.getElementById("encode-output");
    
    compressBtn.addEventListener("click", function() {
        const text = inputText.value.trim();
        
        if (!text) {
            showError("Please enter some text to compress");
            return;
        }
        
        try {
            // Perform compression
            const compressed = huffman.encode(text);
            
            // Display compressed output
            compressedOutput.value = compressed;
            
            // Show output section
            encodeOutput.classList.remove("hidden");
            
            updateCompressionStats();
            
            updateCodesTable();
            
            updateStatisticsTab();
            
            // Auto-fill decode input
            document.getElementById("compressed-input").value = compressed;
            
        } catch (error) {
            showError(`Compression failed: ${error.message}`);
        }
    });
    
    // Display compression statistics
    function updateCompressionStats() {
        const stats = huffman.getStatistics();
        
        document.getElementById("compression-ratio").textContent = `${stats.compressionRatio}:1`;
        document.getElementById("space-saving").textContent = `${stats.spaceSaving}%`;
        document.getElementById("efficiency").textContent = `${stats.averageBitsPerChar} bits/char`;
    }
    
    // Display Huffman codes
    function updateCodesTable() {
        const codesTable = document.getElementById("codes-table");
        codesTable.innerHTML = "";
        
        // Convert codes object to array and sort by code length
        const codeEntries = Object.entries(huffman.codes).sort((a, b) => a[1].length - b[1].length);
        
        codeEntries.forEach(([char, code]) => {
            const item = document.createElement("div");
            item.className = "code-item";
            
            // Display special characters
            let displayChar = char;
            if (char === " ") displayChar = "SPACE";
            else if (char === "\n") displayChar = "NEWLINE";
            else if (char === "\t") displayChar = "TAB";
            
            item.innerHTML = `
                <span class="code-char">${displayChar}</span>
                <span class="code-value">${code}</span>
            `;
            codesTable.appendChild(item);
        });
    }
    
    // Decompression
    const decompressBtn = document.getElementById("decompress-btn");
    const compressedInput = document.getElementById("compressed-input");
    const decompressedOutput = document.getElementById("decompressed-output");
    const decodeOutput = document.getElementById("decode-output");
    
    decompressBtn.addEventListener("click", function() {
        const compressed = compressedInput.value.trim();
        
        if (!compressed) {
            showError("Please enter compressed binary data");
            return;
        }
        
        if (!/^[01]+$/.test(compressed)) {
            showError("Invalid input: only binary digits (0 and 1) are allowed");
            return;
        }
        
        try {
            // Perform decompression
            const decompressed = huffman.decode(compressed);
            
            // Display decompressed output
            decompressedOutput.value = decompressed;
            
            // Show output section
            decodeOutput.classList.remove("hidden");
            
        } catch (error) {
            showError(`Decompression failed: ${error.message}`);
        }
    });
    
    // Statistics tab
    function updateStatisticsTab() {
        const stats = huffman.getStatistics();
        
        // Show statistics content
        document.getElementById("no-data").classList.add("hidden");
        document.getElementById("stats-content").classList.remove("hidden");
        
        // Update size information
        document.getElementById("original-size-text").textContent = `${stats.originalSize} bits`;
        document.getElementById("compressed-size-text").textContent = `${stats.compressedSize} bits`;
        
        // Update compression bar
        const compressionProgress = document.getElementById("compression-progress");
        const compressionPercentage = (stats.compressedSize / stats.originalSize) * 100;
        compressionProgress.style.width = `${compressionPercentage}%`;
        
        // Update frequency table
        updateFrequencyTable();
        
        // Update tree visualization
        visualizeTree();
    }
    
    // Display frequency table
    function updateFrequencyTable() {
        const frequencyTable = document.getElementById("frequency-table");
        frequencyTable.innerHTML = "";
        
        // Calculate total character count
        const totalChars = Object.values(huffman.frequencyTable).reduce((sum, freq) => sum + freq, 0);
        
        // Sort by frequency (descending)
        const sortedFreq = Object.entries(huffman.frequencyTable).sort((a, b) => b[1] - a[1]);
        
        sortedFreq.forEach(([char, freq]) => {
            const percentage = ((freq / totalChars) * 100).toFixed(1);
            const item = document.createElement("div");
            item.className = "frequency-item";
            
            // Display special characters in a readable way
            let displayChar = char;
            if (char === " ") displayChar = "SPACE";
            else if (char === "\n") displayChar = "NEWLINE";
            else if (char === "\t") displayChar = "TAB";
            
            item.innerHTML = `
                <span class="freq-char">${displayChar}</span>
                <span class="freq-count">${freq}</span>
                <span class="freq-percentage">${percentage}%</span>
            `;
            frequencyTable.appendChild(item);
        });
    }
    
    // Create tree visualization
    function visualizeTree() {
        const container = document.getElementById("tree-visualization");
        container.innerHTML = "";
        if (!huffman.root) return;

        // Collect nodes by level and track their parent/child relationships
        const levels = [];
        function traverseTree(node, level) {
            if (!node) return;
            if (!levels[level]) levels[level] = [];
            levels[level].push(node);
            traverseTree(node.left, level + 1);
            traverseTree(node.right, level + 1);
        }
        traverseTree(huffman.root, 0);

        // Set container height 
        const treeHeight = Math.max(levels.length * 40 + 40, 200);
        container.style.height = treeHeight + "px";
        container.style.position = "relative";
        container.style.overflow = "auto";

        // compute width of last level
        const nodeSize = 32; // diameter of each node(bubble)
        const minSpacing = 18; // between leaves
        const maxNodes = Math.max(...levels.map(l => l.length));
        // Use container's clientWidth - to fit the tree inside the box
        const containerWidth = container.clientWidth || 600;
        const treeWidth = Math.max((nodeSize + minSpacing) * maxNodes, containerWidth);
        container.style.width = "100%";

        // Assign x positions recursively and avoid overlap
        let nodePositions = new Map();
        let xCounter = 0;
        function assignPositions(node, depth) {
            if (!node) return;
            if (!node.left && !node.right) {
                // Leaf node
                nodePositions.set(node, xCounter * (nodeSize + minSpacing) + nodeSize);
                xCounter++;
            } else {
                // Internal node: position at the midpoint of its children
                assignPositions(node.left, depth + 1);
                assignPositions(node.right, depth + 1);
                let leftX = node.left ? nodePositions.get(node.left) : 0;
                let rightX = node.right ? nodePositions.get(node.right) : 0;
                let myX = (leftX + rightX) / 2 || leftX || rightX;
                nodePositions.set(node, myX);
            }
        }
        assignPositions(huffman.root, 0);

        // Ensure no node is left of the container (shift all right if needed)
        let minX = Infinity;
        nodePositions.forEach((x) => { if (x < minX) minX = x; });
        let maxX = -Infinity;
        nodePositions.forEach((x) => { if (x > maxX) maxX = x; });

        let graphWidth = maxX - minX + nodeSize;
        let shiftX = 0;

        if (graphWidth < containerWidth) {
            // Center the graph horizontally if it fits within the container
            shiftX = (containerWidth - graphWidth) / 2 - minX;
        } else {
            // Ensure the leftmost part of the graph is visible
            shiftX = -minX + nodeSize / 2 + 8; // +8 for padding
        }

        // Draw SVG for lines
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", Math.max(treeWidth, containerWidth));
        svg.setAttribute("height", treeHeight);
        svg.style.position = "absolute";
        svg.style.left = "0";
        svg.style.top = "0";
        svg.style.zIndex = "1";
        container.appendChild(svg);

        // Draw nodes and lines
        levels.forEach((levelNodes, level) => {
            const y = level * 70 + 20;
            levelNodes.forEach((node) => {
                const x = nodePositions.get(node) + shiftX;
                // Draw lines
                if (node.left) {
                    const childX = nodePositions.get(node.left) + shiftX + 5;
                    const childY = (level + 1) * 70 + 40;
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", x);
                    line.setAttribute("y1", y + nodeSize / 2);
                    line.setAttribute("x2", childX);
                    line.setAttribute("y2", childY - nodeSize / 2);
                    line.setAttribute("stroke", "var(--color-primary)");
                    line.setAttribute("stroke-width", "2");
                    svg.appendChild(line);
                }
                if (node.right) {
                    const childX = nodePositions.get(node.right) + shiftX + 5;
                    const childY = (level + 1) * 70 + 40;
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", x);
                    line.setAttribute("y1", y + nodeSize / 2);
                    line.setAttribute("x2", childX);
                    line.setAttribute("y2", childY - nodeSize / 2);
                    line.setAttribute("stroke", "var(--color-primary)");
                    line.setAttribute("stroke-width", "2");
                    svg.appendChild(line);
                }
                // Draw node
                const nodeElement = document.createElement("div");
                nodeElement.className = `tree-node ${node.char ? "leaf" : "internal"}`;
                nodeElement.style.left = `${x - nodeSize / 2}px`;
                nodeElement.style.top = `${y}px`;
                nodeElement.style.display = "flex";
                nodeElement.style.alignItems = "center";
                nodeElement.style.justifyContent = "center";
                nodeElement.style.fontSize = "14px"; // Adjust font size for visibility
                nodeElement.style.color = "#000"; // Ensure text is visible
                nodeElement.textContent = node.char || node.freq; // Display character or frequency
                container.appendChild(nodeElement);
            });
        });
        // Reset scroll to show leftmost part of tree
        container.scrollLeft = 0;
    }
    
    // Copy buttons
    document.getElementById("copy-compressed").addEventListener("click", function() {
        copyToClipboard("compressed-output", this);
    });
    
    document.getElementById("copy-decompressed").addEventListener("click", function() {
        copyToClipboard("decompressed-output", this);
    });
    
    function copyToClipboard(elementId, button) {
        const element = document.getElementById(elementId);
    const text = element.value || element.innerText || element.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.classList.add("copied");
        button.textContent = "Copied!";

        setTimeout(() => {
            button.classList.remove("copied");
            button.textContent = originalText;
        }, 2000);
        })
    }
    
    // Download button
    document.getElementById("download-compressed").addEventListener("click", function() {
        if (!huffman.compressedBytes) {
            showError("No compressed data available");
            return;
        }

        // Save the codemap (codes) as JSON, and the bit length
        const codemap = JSON.stringify(huffman.codes);
        const bitLength = huffman.compressedText.length;

        // Compose a binary file: [codemap length][codemap][bitLength][data]
        const encoder = new TextEncoder();
        const codemapBytes = encoder.encode(codemap);

        //not working currently
        const header = new Uint8Array(8);
        // Store codemap length (first 4 bytes, big-endian)
        header[0] = (codemapBytes.length >>> 24) & 0xFF;
        header[1] = (codemapBytes.length >>> 16) & 0xFF;
        header[2] = (codemapBytes.length >>> 8) & 0xFF;
        header[3] = codemapBytes.length & 0xFF;
        // Store bitLength (next 4 bytes, big-endian)
        header[4] = (bitLength >>> 24) & 0xFF;
        header[5] = (bitLength >>> 16) & 0xFF;
        header[6] = (bitLength >>> 8) & 0xFF;
        header[7] = bitLength & 0xFF;

        // const headerStr  = `${codemapBytes.length}\n${bitLength}\n`

        // Concatenate all
        const blob = new Blob(
            [header,
             codemapBytes,
             huffman.compressedBytes
            ],
            { type: "application/octet-stream" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "compressed.huff";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    document.getElementById("download-decompressed").addEventListener("click", function() {
        const data = decompressedOutput.value;
        if (!data) {
            showError("No decompressed data available");
            return;
        }
        downloadFile(data, "decompressed.txt");
    });
    
    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Error handling
    const errorToast = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    const closeError = document.getElementById("close-error");
    
    function showError(message) {
        errorText.textContent = message;
        errorToast.classList.remove("hidden");
        errorToast.classList.add("show");
        
        // Auto-hide
        setTimeout(hideError, 5000);
    }
    
    function hideError() {
        errorToast.classList.remove("show");
        setTimeout(() => {
            errorToast.classList.add("hidden");
        }, 300);
    }
    
    closeError.addEventListener("click", hideError);
});