(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./mission.js'):root.UtopiaMission);if(typeof module==='object'&&module.exports)module.exports=api;else root.UtopiaTerrain=api;})(typeof globalThis!=='undefined'?globalThis:this,function(M){
'use strict';
function sample(grid,lat,lon,key='elevation_m'){
 if(!grid||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
 lon=((lon%360)+360)%360;const a=grid.latitudes,b=grid.longitudes,z=grid[key];
 if(!a||!b||!z||a.length<2||b.length<2||lat>a[0]||lat<a[a.length-1]||lon<b[0]||lon>b[b.length-1])return null;
 let r=0,c=0;while(r<a.length-2&&a[r+1]>lat)r++;while(c<b.length-2&&b[c+1]<lon)c++;
 const v=[z[r]?.[c],z[r]?.[c+1],z[r+1]?.[c],z[r+1]?.[c+1]];if(!v.every(Number.isFinite))return null;
 const y=(a[r]-lat)/(a[r]-a[r+1]),x=(lon-b[c])/(b[c+1]-b[c]);return(1-y)*((1-x)*v[0]+x*v[1])+y*((1-x)*v[2]+x*v[3]);
}
function profile(grid,route){
 const out=M.routeCoordinates(route);if(route.length<2)return{points:[],missing_count:0};
 const full=[...out,...out.slice(0,-1).reverse()];let d=0;
 const points=full.map((p,i)=>{if(i)d+=M.distance(full[i-1],p);return{distance_km:d,elevation_m:sample(grid,p.lat,p.lon),slope_degrees:sample(grid,p.lat,p.lon,'slope_degrees')};});
 const elevations=points.map(p=>p.elevation_m).filter(Number.isFinite),slopes=points.map(p=>p.slope_degrees).filter(Number.isFinite);
 return{points,outbound_km:points[out.length-1].distance_km,total_km:d,missing_count:points.filter(p=>p.elevation_m===null||p.slope_degrees===null).length,min_elevation_m:elevations.length?Math.min(...elevations):null,max_elevation_m:elevations.length?Math.max(...elevations):null,max_regional_slope_degrees:slopes.length?Math.max(...slopes):null,source:grid?.metadata?.source_url||null};
}
return{sample,profile};});
