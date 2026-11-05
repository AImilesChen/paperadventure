// Public merchandising only. Full clues, answers, companion and PDFs stay out of the public bundle.
export const escapeProducts=Object.freeze([Object.freeze({
 id:'seventh-carriage',title:'The Missing Seventh Carriage',code:'E01',series:'escape',
 path:'/en/escape-room-games/the-missing-seventh-carriage/',image:'/assets/seventh-carriage-cover.svg',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E01',title:'The Missing Seventh Carriage',image:'/assets/seventh-carriage-cover.svg',goal:'Investigate a missing railway carriage, compare evidence and arrange its return.',beats:['Identify the carriage and seal','Share witness accounts','Compare clocks and sightings','Trace the executed transfer','Reconstruct the depot survey','Choose a valid return service']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
}),Object.freeze({
 id:'midnight-masquerade',title:'The Midnight Masquerade',code:'E02',series:'escape',
 path:'/en/escape-room-games/the-midnight-masquerade/',image:'/assets/midnight-masquerade-cover.svg',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E02',title:'The Midnight Masquerade',image:'/assets/midnight-masquerade-cover.svg',goal:'Share private clues, investigate a sealed display and recover the Dawn Jewel.',beats:['Place six masked guests','Compare the inspections','Combine three witness records','Validate transfer notes','Recover the jewel','Present the complete case']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
}),Object.freeze({
 id:'thirteenth-hour',title:"The Clockmaker's Thirteenth Hour",code:'E03',series:'escape',
 path:'/en/escape-room-games/the-clockmakers-thirteenth-hour/',image:'/assets/thirteenth-hour-cover.svg',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E03',title:"The Clockmaker's Thirteenth Hour",image:'/assets/thirteenth-hour-cover.svg',goal:'Repair three changing workshop scenes and prepare the special chime.',beats:['Select the repair tool','Unfold the lamp','Calibrate the test dials','Reconnect the drive','Return to the changed wall','Prove the final settings']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
}),Object.freeze({
 id:'last-letter',title:'The Last Letter Before the Storm',code:'E04',series:'escape',
 path:'/en/escape-room-games/the-last-letter-before-the-storm/',image:'/assets/last-letter-cover.svg',
 availableSettings:['home'],sku:'ready_home',unitAmount:999,version:'v2.0',
 story:{home:{code:'E04',title:'The Last Letter Before the Storm',image:'/assets/last-letter-cover.svg',goal:'Investigate a sealed letter and choose how to deliver it before the storm.',beats:['Examine the envelope','Choose a route and tool','Compare the route evidence','Decide whether to help','Identify the recipient','Prove a valid handover']}},
 home:{readyStatus:'not_published',packVersion:null},classroom:{readyStatus:'not_offered',packVersion:null}
})]);
export const escapeProduct=id=>escapeProducts.find(p=>p.id===id);
