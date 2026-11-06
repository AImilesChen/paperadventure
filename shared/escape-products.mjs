// Public merchandising only. Full clues, answers, companion and PDFs stay out of the public bundle.
export const escapeProducts=Object.freeze([Object.freeze({
 id:'seventh-carriage',title:'The Missing Seventh Carriage',code:'E01',series:'escape',
 path:'/en/escape-room-games/the-missing-seventh-carriage/',image:'/assets/escape-covers-v2/seventh-carriage.webp',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E01',title:'The Missing Seventh Carriage',image:'/assets/escape-covers-v2/seventh-carriage.webp',goal:'Investigate a missing railway carriage, compare evidence and arrange its return.',beats:['Identify the carriage and seal','Share witness accounts','Compare clocks and sightings','Trace the executed transfer','Reconstruct the depot survey','Choose a valid return service']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
}),Object.freeze({
 id:'midnight-masquerade',title:'The Midnight Masquerade',code:'E02',series:'escape',
 path:'/en/escape-room-games/the-midnight-masquerade/',image:'/assets/escape-covers-v2/midnight-masquerade.webp',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E02',title:'The Midnight Masquerade',image:'/assets/escape-covers-v2/midnight-masquerade.webp',goal:'Share private clues, investigate a sealed display and recover the Dawn Jewel.',beats:['Place six masked guests','Compare the inspections','Combine three witness records','Validate transfer notes','Recover the jewel','Present the complete case']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
}),Object.freeze({
 id:'thirteenth-hour',title:"The Clockmaker's Thirteenth Hour",code:'E03',series:'escape',
 path:'/en/escape-room-games/the-clockmakers-thirteenth-hour/',image:'/assets/escape-covers-v2/thirteenth-hour.webp',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E03',title:"The Clockmaker's Thirteenth Hour",image:'/assets/escape-covers-v2/thirteenth-hour.webp',goal:'Repair three changing workshop scenes and prepare the special chime.',beats:['Select the repair tool','Unfold the lamp','Calibrate the test dials','Reconnect the drive','Return to the changed wall','Prove the final settings']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
}),Object.freeze({
 id:'last-letter',title:'The Last Letter Before the Storm',code:'E04',series:'escape',
 path:'/en/escape-room-games/the-last-letter-before-the-storm/',image:'/assets/escape-covers-v2/last-letter.webp',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E04',title:'The Last Letter Before the Storm',image:'/assets/escape-covers-v2/last-letter.webp',goal:'Investigate a sealed letter and choose how to deliver it before the storm.',beats:['Examine the envelope','Choose a route and tool','Compare the route evidence','Decide whether to help','Identify the recipient','Prove a valid handover']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
}),Object.freeze({
 id:'fold-city',title:'The Secret of Fold City',code:'E05',series:'escape',
 path:'/en/escape-room-games/the-secret-of-fold-city/',image:'/assets/escape-covers-v2/fold-city.webp',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E05',title:'The Secret of Fold City',image:'/assets/escape-covers-v2/fold-city.webp',goal:'Turn and fold a shared paper map, recover two clasps and find the way outside.',beats:['Enter the paper city','Turn a quarter','Join a hidden road','Uncover lower streets','Carry both return clasps','Walk beyond the map']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
})]);
export const escapeProduct=id=>escapeProducts.find(p=>p.id===id);
