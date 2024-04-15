"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValue = exports.getElementById = exports.addCodeQuote = exports.scrollToTop = exports.updatePreview = exports.copyToClipboard = exports.getBadgeUrl = exports.generateMarkdown = exports.handleInputChange = exports.initialize = void 0;
var marked = __importStar(require("marked"));
document.addEventListener('DOMContentLoaded', initialize);
function initialize() {
    marked.setOptions({
        gfm: true,
        breaks: true,
    });
    var inputIds = ['details', 'gif-url', 'technologies', 'dependencies', 'local-configuration', 'testing', 'support'];
    inputIds.forEach(addInputListener);
    var licenceElement = getElementById('licence');
    if (licenceElement) {
        licenceElement.addEventListener('change', handleInputChange);
    }
    var detailsInput = getElementById('details');
    if (detailsInput) {
        detailsInput.dispatchEvent(new Event('input'));
    }
    var copyButton = getElementById('copy-output');
    if (copyButton) {
        copyButton.addEventListener('click', copyToClipboard);
    }
    var scrollToTopButton = getElementById('scroll-top');
    if (scrollToTopButton) {
        scrollToTopButton.addEventListener('click', scrollToTop);
    }
    var addQuoteButton = getElementById('add-code-quote');
    if (addQuoteButton) {
        addQuoteButton.addEventListener('click', function () { return addCodeQuote('local-configuration'); });
    }
    var addQuoteBelowButton = getElementById('add-code-quote-below');
    if (addQuoteBelowButton) {
        addQuoteBelowButton.addEventListener('click', function () { return addCodeQuote('testing'); });
    }
}
exports.initialize = initialize;
function addInputListener(inputId) {
    var inputElement = getElementById(inputId);
    if (inputElement) {
        inputElement.addEventListener('input', handleInputChange);
    }
}
function handleInputChange() {
    return __awaiter(this, void 0, void 0, function () {
        var markdownContent, htmlContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    markdownContent = generateMarkdown();
                    return [4 /*yield*/, marked.parse(markdownContent)];
                case 1:
                    htmlContent = _a.sent();
                    updatePreview(markdownContent, htmlContent);
                    return [2 /*return*/];
            }
        });
    });
}
exports.handleInputChange = handleInputChange;
function generateMarkdown() {
    var details = getValue('details').trim();
    var gifUrl = getValue('gif-url').trim();
    var technologies = getValue('technologies').split(',').map(function (t) { return t.trim(); }).filter(Boolean).map(function (t) { return "- ".concat(t); }).join('\n');
    var dependencies = getValue('dependencies').split(',').map(function (r) { return r.trim(); }).filter(Boolean).map(function (r) { return "- ".concat(r); }).join('\n');
    var localConfiguration = getValue('local-configuration').trim();
    var testing = getValue('testing').trim();
    var support = getValue('support').trim();
    var licence = getValue('licence');
    var badgeUrl = getBadgeUrl(licence);
    var markdownContent = '';
    if (licence !== '') {
        markdownContent += "![License](".concat(badgeUrl, ")\n\n");
    }
    markdownContent += "## Summary\n\n";
    if (details)
        markdownContent += "- [Details](#details)\n";
    if (technologies)
        markdownContent += "- [Technologies](#technologies)\n";
    if (dependencies)
        markdownContent += "- [Dependencies](#dependencies)\n";
    if (localConfiguration)
        markdownContent += "- [Local Configuration](#local-configuration)\n";
    if (testing)
        markdownContent += "- [Testing](#testing)\n";
    if (support)
        markdownContent += "- [Support](#support)\n";
    if (details !== '') {
        markdownContent += "## Details\n".concat(details, "\n\n");
    }
    if (gifUrl !== '') {
        markdownContent += "![GIF](".concat(gifUrl, ")\n\n");
    }
    if (technologies !== '') {
        markdownContent += "## Technologies\n".concat(technologies, "\n\n");
    }
    if (dependencies !== '') {
        markdownContent += "## Dependencies\n".concat(dependencies, "\n\n");
    }
    if (localConfiguration !== '') {
        markdownContent += "## Local Configuration\n".concat(localConfiguration, "\n\n");
    }
    if (testing !== '') {
        markdownContent += "## Testing\n".concat(testing, "\n\n");
    }
    if (support !== '') {
        markdownContent += "## Support\n".concat(support, "\n\n");
    }
    return markdownContent;
}
exports.generateMarkdown = generateMarkdown;
function getBadgeUrl(licence) {
    var badgeUrls = {
        'MIT': 'https://img.shields.io/badge/License-MIT-blue',
        'Apache-2.0': 'https://img.shields.io/badge/License-Apache%202.0-blue',
        'GPL-3.0': 'https://img.shields.io/badge/License-GPL%203.0-blue',
        'BSD-3-Clause': 'https://img.shields.io/badge/License-BSD%203--Clause-blue',
        'ISC': 'https://img.shields.io/badge/License-ISC-blue',
        'Mozilla-2.0': 'https://img.shields.io/badge/License-MPL%202.0-blue',
        'AGPL-3.0': 'https://img.shields.io/badge/License-AGPL%203.0-blue',
        'LGPL-3.0': 'https://img.shields.io/badge/License-LGPL%203.0-blue',
        'CC0-1.0': 'https://img.shields.io/badge/License-CC0%201.0-blue',
        'EPL-2.0': 'https://img.shields.io/badge/License-EPL%202.0-blue',
        'Unlicense': 'https://img.shields.io/badge/license-Unlicense-blue.svg',
    };
    return badgeUrls[licence] || '';
}
exports.getBadgeUrl = getBadgeUrl;
function copyToClipboard() {
    var outputTextarea = getElementById('markdown-output');
    if (!outputTextarea)
        return;
    outputTextarea.select();
    navigator.clipboard.writeText(outputTextarea.value)
        .then(function () {
        alert('README content copied to clipboard!');
    })
        .catch(function (error) {
        console.error('Failed to copy to clipboard:', error);
    });
}
exports.copyToClipboard = copyToClipboard;
function updatePreview(markdownContent, htmlContent) {
    var previewElement = getElementById('markdown-preview');
    var outputElement = getElementById('markdown-output');
    if (previewElement)
        previewElement.innerHTML = htmlContent;
    if (outputElement)
        outputElement.value = markdownContent;
}
exports.updatePreview = updatePreview;
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
}
exports.scrollToTop = scrollToTop;
function addCodeQuote(inputId) {
    var currentVal = getValue(inputId);
    var quote = '```bash\n# Insert your code quote here\n```';
    var element = getElementById(inputId);
    if (element) {
        element.value = "".concat(currentVal, "\n").concat(quote);
        element.dispatchEvent(new Event('input'));
    }
}
exports.addCodeQuote = addCodeQuote;
function getElementById(id) {
    return document.getElementById(id);
}
exports.getElementById = getElementById;
function getValue(id) {
    var element = getElementById(id);
    return element ? element.value : '';
}
exports.getValue = getValue;
