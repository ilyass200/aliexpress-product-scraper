const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { get: GetVariants } = require("./variants.js");
const { get: GetReviews } = require("./reviews.js");
const { get: GetShippingDetails } = require("./shipping.js");

const AliexpressProductScraper = async (
  id,
  { reviewsCount = 20, filterReviewsBy = "all", puppeteerOptions = {}, onlyInfo=false } = {}
) => {
  if (!id) {
    throw new Error("Please provide a valid product id");
  }

  let browser;

  try {
    const REVIEWS_COUNT = reviewsCount || 20;
    browser = await puppeteer.launch({
      headless: "new",
      ...(puppeteerOptions || {}),
    });
    const page = await browser.newPage();

    /** Scrape the aliexpress product page for details */
    await page.goto(`https://www.aliexpress.com/item/${id}.html`);
    const aliExpressData = await page.evaluate(() => runParams);

    const data = aliExpressData?.data;
    if (!data) {
      throw new Error("No data found");
    }

    if(!onlyInfo){
      const shipping = GetShippingDetails(
        data?.webGeneralFreightCalculateComponent?.originalLayoutResultList || []
      );
    }

    /** Scrape the description page for the product using the description url */
    const descriptionUrl = data?.productDescComponent?.descriptionUrl;
    let descriptionDataPromise = null;
    if (descriptionUrl) {
      descriptionDataPromise = page.goto(descriptionUrl).then(async () => {
        const descriptionPageHtml = await page.content();
        const $ = cheerio.load(descriptionPageHtml);
        const paragraphs = [];
        $('p').each((index, element) => {
          const paragraphText = $(element).text();
          paragraphs.push({ index, text: paragraphText });
        });

        return paragraphs;
      });
    }

    let reviewsPromise = null;
    if(!onlyInfo) {
      reviewsPromise = GetReviews({
        productId: id,
        limit: REVIEWS_COUNT,
        total: data.feedbackComponent.totalValidNum,
        filterReviewsBy,
      });
    }

    const [descriptionData, reviews] = await Promise.all([
        descriptionDataPromise,
        reviewsPromise,
    ]);

    await browser.close();

    /** Build the JSON response with aliexpress product details */
    let json = null;
    if(onlyInfo) {
       json = {
        title: data.productInfoComponent.subject,
        description: descriptionData,
        images: (data.imageComponent && data.imageComponent.imagePathList) || [],
        variants: GetVariants({
          optionsLists: data?.skuComponent?.productSKUPropertyList || [],
        }),
        currencyInfo: data.currencyComponent,
        originalPrice: {
          min: data.priceComponent.origPrice.minAmount,
          max: data.priceComponent.origPrice.maxAmount,
        },
        salePrice: {
          min: data.priceComponent.discountPrice.minActivityAmount,
          max: data.priceComponent.discountPrice.maxActivityAmount,
        },
        specs: data.productPropComponent.props,
      };
    } else {
       json = {
      title: data.productInfoComponent.subject,
      categoryId: data.productInfoComponent.categoryId,
      productId: data.productInfoComponent.id,
      quantity: {
        total: data.inventoryComponent.totalQuantity,
        available: data.inventoryComponent.totalAvailQuantity,
      },
      description: descriptionData,
      orders: data.tradeComponent.formatTradeCount,
      storeInfo: {
        name: data.sellerComponent.storeName,
        logo: data.sellerComponent.storeLogo,
        companyId: data.sellerComponent.companyId,
        storeNumber: data.sellerComponent.storeNum,
        isTopRated: data.sellerComponent.topRatedSeller,
        hasPayPalAccount: data.sellerComponent.payPalAccount,
        ratingCount: data.storeFeedbackComponent.sellerPositiveNum,
        rating: data.storeFeedbackComponent.sellerPositiveRate,
      },
      ratings: {
        totalStar: 5,
        averageStar: data.feedbackComponent.evarageStar,
        totalStartCount: data.feedbackComponent.totalValidNum,
        fiveStarCount: data.feedbackComponent.fiveStarNum,
        fourStarCount: data.feedbackComponent.fourStarNum,
        threeStarCount: data.feedbackComponent.threeStarNum,
        twoStarCount: data.feedbackComponent.twoStarNum,
        oneStarCount: data.feedbackComponent.oneStarNum,
      },
      images: (data.imageComponent && data.imageComponent.imagePathList) || [],
      reviews,
      variants: GetVariants({
        optionsLists: data?.skuComponent?.productSKUPropertyList || [],
      }),
      specs: data.productPropComponent.props,
      currencyInfo: data.currencyComponent,
      originalPrice: {
        min: data.priceComponent.origPrice.minAmount,
        max: data.priceComponent.origPrice.maxAmount,
      },
      salePrice: {
        min: data.priceComponent.discountPrice.minActivityAmount,
        max: data.priceComponent.discountPrice.maxActivityAmount,
      },
      shipping,
       };
   }

    return json;
  } catch (error) {
    console.error(error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
};

module.exports = AliexpressProductScraper;
