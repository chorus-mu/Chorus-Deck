const fs = require('fs');
const file = 'C:\\Users\\pushk\\OneDrive\\Desktop\\Chorus Deck\\Chorus-Deck\\src\\renderer\\views\\set\\tabs\\DiscordTab.vue';
let content = fs.readFileSync(file, 'utf8');

const newTemplate = fs.readFileSync('C:\\Users\\pushk\\OneDrive\\Desktop\\Chorus Deck\\Chorus-Deck\\new_template.txt', 'utf8');

const startIndex = content.indexOf('<template>');
const endIndex = content.indexOf('</template>') + '</template>'.length;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + newTemplate + content.slice(endIndex);
  fs.writeFileSync(file, content);
  console.log('Template replaced successfully');
} else {
  console.log('Could not find template tags');
}
