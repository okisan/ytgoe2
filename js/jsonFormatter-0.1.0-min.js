var JSONFormatter = function (json, format) {
  this.allHTML = '';
  this.rawJSONText = json || {};
  this.json = ((typeof this.rawJSONText) == 'string') ? jQuery.parseJSON(this.rawJSONText) : json;
  this.formatClass = "jsoncode";
  this.format = format;
  this.syntaxMap = {'html': {'newlineStart': '<li>', 'newlineEnd': '</li>', 'newSectionStart': '<ul>', 'newSectionEnd': '</ul>', 'indent': ''}, 'text': {'newlineStart': '<br/>', 'newlineEnd': '', 'newSectionStart': '', 'newSectionEnd': '<br/>', 'indent': '  '}, 'pre': {'newlineStart': '\n', 'newlineEnd': '', 'newSectionStart': '', 'newSectionEnd': '\n', 'indent': '  '}};
  this.newlineStart = this.syntaxMap[this.format]['newlineStart'] || '';
  this.newlineEnd = this.syntaxMap[this.format]['newlineEnd'] || '';
  this.newsectionStart = this.syntaxMap[this.format]['newSectionStart'] || '';
  this.newsectionEnd = this.syntaxMap[this.format]['newSectionEnd'] || '';
  this.indent = this.syntaxMap[this.format]['indent'];
  this.indentCount = 0;
}
JSONFormatter.prototype.getIndent = function () {
  var indent = '';
  for (var i = 0; i < this.indentCount; i++) {
    indent += this.indent;
  }
  return indent;
}
JSONFormatter.prototype.getNewLineStart = function () {
  return this.newlineStart + this.getIndent();
};
JSONFormatter.prototype.getNewLineEnd = function () {
  return this.newlineEnd + this.getIndent();
};
JSONFormatter.prototype.getNewSectionStart = function () {
  var nss = this.newsectionStart + this.getIndent();
  this.indentCount++;
  return nss;
};
JSONFormatter.prototype.getNewSectionEnd = function () {
  this.indentCount--;
  var nse = this.newsectionEnd + this.getIndent();
  return nse;
};
JSONFormatter.prototype.formatJSON = function () {
  if (this.format == 'html')this.allHTML += '<span class="' + this.formatClass + '">';
  this.allHTML += this.traverseItem(this.json);
  if (this.format == 'html')this.allHTML += '</span>';
  return this.allHTML;
}
JSONFormatter.prototype.processArray = function (subItem) {
  var startTag = '[';
  var endTag = ']';
  if (subItem.length == 0)return startTag + ' ' + endTag;
  var html = '';
  html += '[' + this.getNewSectionStart() + this.getNewLineStart();
  for (var i = 0; i < subItem.length; i++) {
    var value = subItem[i];
    var valueType = jQuery.type(value);
    if (valueType == 'string') {
      html += '"' + value + '"';
    } else if (valueType == 'object' || valueType == 'array') {
      html += this.traverseItem(value);
    } else {
      html += value;
    }
    if (i + 1 < subItem.length)html += ', '
  }
  html += this.getNewLineEnd() + this.getNewSectionEnd() + ']';
  return html;
}
JSONFormatter.prototype.objTypeHTML = function (objType, subItem) {
  var html = '';
  if (objType == 'array') {
    html += this.processArray(subItem);
  } else if (objType == 'string') {
    html += '"';
    html += subItem;
    html += '"';
  } else {
    html += subItem;
  }
  return html;
}
JSONFormatter.prototype.traverseItem = function (item) {
  var thisItemType = jQuery.type(item);
  var thisHTML = '';
  if (thisItemType == 'array')thisHTML += this.processArray(item); else {
    var startTag = thisItemType == 'object' ? '{' : '[';
    var endTag = thisItemType == 'object' ? '}' : ']';
    var numItemKeys = 0;
    for (var key in item) {
      numItemKeys++;
    }
    if (numItemKeys == 0) {
      return startTag + ' ' + endTag;
    }
    thisHTML = startTag;
    thisHTML += this.getNewSectionStart();
    var i = 0;
    for (var key in item) {
      var subItem = item[key];
      var objType = jQuery.type(subItem);
      var subItemHTML = this.getNewLineStart();
      subItemHTML += '"';
      subItemHTML += key;
      subItemHTML += '": ';
      if (objType == 'array' || objType == 'number' || objType == 'boolean' || objType == 'string') {
        subItemHTML += this.objTypeHTML(objType, subItem);
      } else if (jQuery.type(subItem) == 'object') {
        subItemHTML += this.traverseItem(subItem);
      }
      if (i + 1 < numItemKeys)thisHTML += subItemHTML + ',';
      subItemHTML += this.getNewLineEnd();
      i++;
    }
    thisHTML += subItemHTML + this.getNewSectionEnd();
    thisHTML += endTag;
  }
  return thisHTML;
}