// Public merchandising only. Full clues, answers, companion and PDFs stay out of the public bundle.
export const escapeProducts=Object.freeze([Object.freeze({
 id:'seventh-carriage',title:'The Missing Seventh Carriage',code:'E01',series:'escape',
 path:'/en/escape-room-games/the-missing-seventh-carriage/',image:'/assets/seventh-carriage-cover.svg',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E01',title:'The Missing Seventh Carriage',image:'/assets/seventh-carriage-cover.svg',goal:'Investigate a missing railway carriage, compare evidence and arrange its return.',beats:['Identify the carriage and seal','Share witness accounts','Compare clocks and sightings','Trace the executed transfer','Reconstruct the depot survey','Choose a valid return service']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
})]);
export const escapeProduct=id=>escapeProducts.find(p=>p.id===id);
