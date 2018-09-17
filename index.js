var child = require('child_process').execFile;
var executablePath = "geckodriver.exe";

child(executablePath, function(err, data) {
     console.log(err)
     console.log(data.toString());
});

var settings = require('./settings.json');

var Promise = require('promise');

var log4js = require('log4js');
log4js.configure({
  appenders: {
    everything: { type: 'file', filename: 'bot-logs.log' }
  },
  categories: {
    default: { appenders: [ 'everything' ], level: 'debug' }
  }
});
const logger = log4js.getLogger();
logger.debug('I will be logged in bot-logs.log');

const {Builder, By, Key, until} = require('selenium-webdriver');
let browser = new Builder()
    .forBrowser('firefox')
    .usingServer('http://localhost:4444')
    .build();

browser.get('https://www.instagram.com/accounts/login/');
logger.info('I am at Instagram');
browser.sleep(settings.sleep_delay);
browser.findElement(By.name('username')).sendKeys(settings.instagram_account_username);
browser.findElement(By.name('password')).sendKeys(settings.instagram_account_password);
browser.findElement(By.xpath('//button')).click();
logger.info('I am logining...');
browser.sleep(settings.sleep_delay).then(function() {
    like_by_nickname(0);
});

var xpath_first_photo = '//*[@id="react-root"]/section/main/article/div/div[1]/div[1]/div[1]/a';
var xpath_like_class = '/html/body/div[4]/div/div[2]/div/article/div[2]/section[1]/a[1]/span';
var xpath_like_button = '/html/body/div[4]/div/div[2]/div/article/div[2]/section[1]/a[1]';
var xpath_nextprev_buttons = '/html/body/div[4]/div/div[1]/div/div/a';

function like_by_nickname(indexNickname) {
    if (indexNickname >= settings.instagram_accounts_to_be_liked.length) {
        logger.info('Everything is done. Finishing...');
        browser.quit();
        return;
    }
    var promise = new Promise(function (resolve, reject) {    
        browser.sleep(settings.sleep_delay);
        logger.info('Doing likes for: ' + settings.instagram_accounts_to_be_liked[indexNickname]);
        browser.get('https://instagram.com/' + settings.instagram_accounts_to_be_liked[indexNickname]);
        browser.sleep(settings.sleep_delay);
        browser.findElement(By.xpath(xpath_first_photo)).click().then(function () {
            like(resolve, 0, settings.like_depth_per_user);
        });
    });
    promise.then(function() {
        indexNickname++;
        like_by_nickname(indexNickname);
    });
};

function like(resolve, index, max_likes) {
    browser.getCurrentUrl().then(function(url) {
        logger.debug('Current url:   ' + url);
        browser.sleep(settings.sleep_delay);

        browser.findElement(By.xpath(xpath_like_class)).getAttribute('class').then(function(classname) {
            logger.debug('CSS Classname: ' + classname);
            if (settings.smart_like_mode && (classname.indexOf('whiteoutSpriteHeartFull') > 0)) {
                logger.info('Already liked. Stopping...');
                resolve();
                return;
            } else {
                if (classname.indexOf('whiteoutSpriteHeartOpen') > 0) {
                    browser.findElement(By.xpath(xpath_like_button)).click();
                    browser.sleep(settings.sleep_delay);
                };
                // Analyzing "Next" button availability
                browser.findElements(By.xpath(xpath_nextprev_buttons)).then(function(buttons) {
                    logger.debug('Buttons: ' + buttons.length + ', Photo Index: ' + index);
                    if (((index == 0) && (buttons.length == 1)) || (buttons.length == 2)) {
                        buttons[buttons.length - 1].click().then(function() {
                            // if we exceed maximum likes depth, stop like this current user.
                            index++;
                            if (index == max_likes) {
                                resolve();
                                return;
                            }
                            like(resolve, index, max_likes);
                        });
                    } else {
                        // "Next" button doesn't exist. Stop like this current user.
                        logger.info('Next button does not exist. Stopping...');
                        resolve();
                        return;
                    }
                });
            }
        });
    });
}


// browser.findElement(By.name('q')).sendKeys('webbrowser', Key.RETURN);
// browser.wait(until.titleIs('webbrowser - Google Search'), 1000);
// browser.quit();


