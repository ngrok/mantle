/**
 * Each prop name that React's types accept on a DOM element: the keys of the
 * `*Attributes` interfaces in `@types/react`. A name with a `-` is left out,
 * because TypeScript accepts each hyphenated JSX attribute. A test keeps this
 * list in step with the installed `@types/react`.
 */
export const DOM_PROP_NAMES: ReadonlySet<string> = new Set(
	`
	abbr about accentHeight accept acceptCharset accessKey accumulate action additive align
	alignmentBaseline allow allowFullScreen allowReorder allowTransparency allowpopups alphabetic
	alt amplitude arabicForm as ascent async attributeName attributeType autoCapitalize
	autoComplete autoCorrect autoFocus autoPlay autoReverse autoSave autosize azimuth baseFrequency
	baseProfile baselineShift bbox begin bgcolor bias blinkfeatures blocking border by calcMode
	capHeight capture cellPadding cellSpacing challenge charSet checked children cite classID
	className clip clipPath clipPathUnits clipRule closedby colSpan color colorInterpolation
	colorInterpolationFilters colorProfile colorRendering cols content contentEditable
	contentScriptType contentStyleType contextMenu controls controlsList coords crossOrigin cursor
	cx cy d dangerouslySetInnerHTML data datatype dateTime decelerate decoding default
	defaultChecked defaultValue defer descent diffuseConstant dir dirName direction
	disablePictureInPicture disableRemotePlayback disableblinkfeatures disabled disableguestresize
	disablewebsecurity display divisor dominantBaseline download draggable dur dx dy edgeMode
	elevation enableBackground encType end enterKeyHint exponent exportparts
	externalResourcesRequired fetchPriority fill fillOpacity fillRule filter filterRes filterUnits
	floodColor floodOpacity focusable fontFamily fontSize fontSizeAdjust fontStretch fontStyle
	fontVariant fontWeight form formAction formEncType formMethod formNoValidate formTarget format
	fr frame frameBorder from fx fy g1 g2 glyphName glyphOrientationHorizontal
	glyphOrientationVertical glyphRef gradientTransform gradientUnits guestinstance hanging headers
	height hidden high horizAdvX horizOriginX href hrefLang htmlFor httpEquiv httpreferrer id
	ideographic imageRendering imageSizes imageSrcSet in in2 inert inlist inputMode integrity
	intercept is itemID itemProp itemRef itemScope itemType k k1 k2 k3 k4 kernelMatrix
	kernelUnitLength kerning key keyParams keyPoints keySplines keyTimes keyType kind label lang
	lengthAdjust letterSpacing lightingColor limitingConeAngle list loading local loop low manifest
	marginHeight marginWidth markerEnd markerHeight markerMid markerStart markerUnits markerWidth
	mask maskContentUnits maskUnits mathematical max maxLength media mediaGroup method min
	minLength mode multiple muted name noModule noValidate nodeintegration nonce numOctaves offset
	onAbort onAbortCapture onAnimationEnd onAnimationEndCapture onAnimationIteration
	onAnimationIterationCapture onAnimationStart onAnimationStartCapture onAuxClick
	onAuxClickCapture onBeforeInput onBeforeInputCapture onBeforeToggle onBlur onBlurCapture
	onCanPlay onCanPlayCapture onCanPlayThrough onCanPlayThroughCapture onCancel onChange
	onChangeCapture onClick onClickCapture onClose onCompositionEnd onCompositionEndCapture
	onCompositionStart onCompositionStartCapture onCompositionUpdate onCompositionUpdateCapture
	onContextMenu onContextMenuCapture onCopy onCopyCapture onCut onCutCapture onDoubleClick
	onDoubleClickCapture onDrag onDragCapture onDragEnd onDragEndCapture onDragEnter
	onDragEnterCapture onDragExit onDragExitCapture onDragLeave onDragLeaveCapture onDragOver
	onDragOverCapture onDragStart onDragStartCapture onDrop onDropCapture onDurationChange
	onDurationChangeCapture onEmptied onEmptiedCapture onEncrypted onEncryptedCapture onEnded
	onEndedCapture onError onErrorCapture onFocus onFocusCapture onGotPointerCapture
	onGotPointerCaptureCapture onInput onInputCapture onInvalid onInvalidCapture onKeyDown
	onKeyDownCapture onKeyPress onKeyPressCapture onKeyUp onKeyUpCapture onLoad onLoadCapture
	onLoadStart onLoadStartCapture onLoadedData onLoadedDataCapture onLoadedMetadata
	onLoadedMetadataCapture onLostPointerCapture onLostPointerCaptureCapture onMouseDown
	onMouseDownCapture onMouseEnter onMouseLeave onMouseMove onMouseMoveCapture onMouseOut
	onMouseOutCapture onMouseOver onMouseOverCapture onMouseUp onMouseUpCapture onPaste
	onPasteCapture onPause onPauseCapture onPlay onPlayCapture onPlaying onPlayingCapture
	onPointerCancel onPointerCancelCapture onPointerDown onPointerDownCapture onPointerEnter
	onPointerLeave onPointerMove onPointerMoveCapture onPointerOut onPointerOutCapture
	onPointerOver onPointerOverCapture onPointerUp onPointerUpCapture onProgress onProgressCapture
	onRateChange onRateChangeCapture onReset onResetCapture onResize onResizeCapture onScroll
	onScrollCapture onScrollEnd onScrollEndCapture onSeeked onSeekedCapture onSeeking
	onSeekingCapture onSelect onSelectCapture onStalled onStalledCapture onSubmit onSubmitCapture
	onSuspend onSuspendCapture onTimeUpdate onTimeUpdateCapture onToggle onTouchCancel
	onTouchCancelCapture onTouchEnd onTouchEndCapture onTouchMove onTouchMoveCapture onTouchStart
	onTouchStartCapture onTransitionCancel onTransitionCancelCapture onTransitionEnd
	onTransitionEndCapture onTransitionRun onTransitionRunCapture onTransitionStart
	onTransitionStartCapture onVolumeChange onVolumeChangeCapture onWaiting onWaitingCapture
	onWheel onWheelCapture opacity open operator optimum order orient orientation origin overflow
	overlinePosition overlineThickness paintOrder panose1 part partition path pathLength pattern
	patternContentUnits patternTransform patternUnits ping placeholder playsInline plugins
	pointerEvents points pointsAtX pointsAtY pointsAtZ popover popoverTarget popoverTargetAction
	poster precedence prefix preload preserveAlpha preserveAspectRatio primitiveUnits property r
	radioGroup radius readOnly ref refX refY referrerPolicy rel renderingIntent repeatCount
	repeatDur required requiredExtensions requiredFeatures resource restart result results rev
	reversed role rotate rowSpan rows rules rx ry sandbox scale scope scoped scrolling seamless
	security seed selected shape shapeRendering size sizes slope slot spacing span specularConstant
	specularExponent speed spellCheck spreadMethod src srcDoc srcLang srcSet start startOffset
	stdDeviation stemh stemv step stitchTiles stopColor stopOpacity strikethroughPosition
	strikethroughThickness string stroke strokeDasharray strokeDashoffset strokeLinecap
	strokeLinejoin strokeMiterlimit strokeOpacity strokeWidth style summary
	suppressContentEditableWarning suppressHydrationWarning surfaceScale systemLanguage tabIndex
	tableValues target targetX targetY textAnchor textDecoration textLength textRendering title to
	transform translate type typeof u1 u2 underlinePosition underlineThickness unicode unicodeBidi
	unicodeRange unitsPerEm unselectable useMap useragent vAlphabetic vHanging vIdeographic
	vMathematical valign value values vectorEffect version vertAdvY vertOriginX vertOriginY viewBox
	viewTarget visibility vocab webpreferences width widths wmode wordSpacing wrap writingMode x x1
	x2 xChannelSelector xHeight xlinkActuate xlinkArcrole xlinkHref xlinkRole xlinkShow xlinkTitle
	xlinkType xmlBase xmlLang xmlSpace xmlns xmlnsXlink y y1 y2 yChannelSelector z zoomAndPan`
		.trim()
		.split(/\s+/),
);
