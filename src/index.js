// ITk to load data
import readFile from "itk/readFile";
import ITKHelper from "vtk.js/Sources/Common/DataModel/ITKHelper";

// Render Marching cube
import vtkActor from "vtk.js/Sources/Rendering/Core/Actor";
import vtkOrientationMarkerWidget from "vtk.js/Sources/Interaction/Widgets/OrientationMarkerWidget";
import vtkAnnotatedCubeActor from "vtk.js/Sources/Rendering/Core/AnnotatedCubeActor";
import vtkImageMarchingCubes from "vtk.js/Sources/Filters/General/ImageMarchingCubes";
import vtkMapper from "vtk.js/Sources/Rendering/Core/Mapper";

// Render window
import vtkOpenGLRenderWindow from "vtk.js/Sources/Rendering/OpenGL/RenderWindow";
import vtkRenderWindow from "vtk.js/Sources/Rendering/Core/RenderWindow";
import vtkRenderer from "vtk.js/Sources/Rendering/Core/Renderer";

// Window Interactor
import vtkRenderWindowInteractor from "vtk.js/Sources/Rendering/Core/RenderWindowInteractor";
import vtkInteractorStyleTrackballCamera from "vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera";

// Reslice widget
import vtkImageSlice from "vtk.js/Sources/Rendering/Core/ImageSlice";
import vtkImageMapper from "vtk.js/Sources/Rendering/Core/ImageMapper";
import vtkImageReslice from "vtk.js/Sources/Imaging/Core/ImageReslice";
import vtkResliceCursorWidget from "vtk.js/Sources/Widgets/Widgets3D/ResliceCursorWidget";
import vtkWidgetManager from "vtk.js/Sources/Widgets/Core/WidgetManager";
import vtkInteractorStyleImage from "vtk.js/Sources/Interaction/Style/InteractorStyleImage";

const { convertItkToVtkImage } = ITKHelper;

const ViewTypes = {
    AXIAL: 4,
    CORONAL: 5,
    DEFAULT: 0,
    GEOMETRY: 1,
    SAGITTAL: 6,
    SLICE: 2,
    VOLUME: 3,
};

function updateReslice(widget, viewtype, reslice, actor, renderer) {
    const modified = widget.updateReslicePlane(reslice, viewtype);
    if (modified) {
        // Get returned modified from setter to know if we have to render
        actor.setUserMatrix(reslice.getResliceAxes());
        widget.resetCamera(renderer, viewtype);
    }
    return modified;
}

// OPEN DICOM SOURCE IMAGE
document.querySelector("#dcmInputFile").onchange = function (e) {
    console.log("====== dcmInputFile clicked ======");

    const files = e.target.files;
    if (!files.length) {
        console.warn("cannot find files");
        return;
    }

    readFile(null, files[0]).then(function ({
        image,
        mesh,
        polyData,
        webWorker,
    }) {
        // 1. first use ITKHelper to covert ITK image to VTK image
        const data = convertItkToVtkImage(image);
        const viewAttributes = [];
        const widget = vtkResliceCursorWidget.newInstance();
        widget.getWidgetState().setOpacity(0.6);
        const sliceTypes = [
            ViewTypes.CORONAL,
            ViewTypes.SAGITTAL,
            ViewTypes.AXIAL,
        ];

        // 2. Populate MPR windows
        for (let i = 0; i < 3; i++) {
            const paneId = "#vtkPane" + (i + 2);
            const element = document.querySelector(paneId);

            const obj = {
                renderWindow: vtkRenderWindow.newInstance(),
                renderer: vtkRenderer.newInstance(),
                GLWindow: vtkOpenGLRenderWindow.newInstance(),
                interactor: vtkRenderWindowInteractor.newInstance(),
                widgetManager: vtkWidgetManager.newInstance(),
            };

            obj.renderer.getActiveCamera().setParallelProjection(true);
            obj.renderer.setBackground(1, 1, 0);
            obj.renderWindow.addRenderer(obj.renderer);
            obj.renderWindow.addView(obj.GLWindow);
            obj.renderWindow.setInteractor(obj.interactor);
            obj.GLWindow.setContainer(element);
            obj.interactor.setView(obj.GLWindow);
            obj.interactor.initialize();
            obj.interactor.bindEvents(element);
            obj.interactor.setInteractorStyle(
                vtkInteractorStyleImage.newInstance()
            );
            obj.widgetManager.setRenderer(obj.renderer);
            obj.widgetInstance = obj.widgetManager.addWidget(
                widget,
                sliceTypes[i]
            );
            obj.widgetManager.enablePicking();
            // Use to update all renderers buffer when actors are moved
            // obj.widgetManager.setCaptureOn(CaptureOn.MOUSE_MOVE);

            obj.reslice = vtkImageReslice.newInstance();
            obj.reslice.setTransformInputSampling(false);
            obj.reslice.setAutoCropOutput(true);
            obj.reslice.setOutputDimensionality(2);
            obj.resliceMapper = vtkImageMapper.newInstance();
            obj.resliceMapper.setInputConnection(obj.reslice.getOutputPort());
            obj.resliceActor = vtkImageSlice.newInstance();
            obj.resliceActor.setMapper(obj.resliceMapper);

            viewAttributes.push(obj);
        }

        // 3. Set image on widget
        widget.setImage(data);

        // 4. Reslice view attributes
        for (let i = 0; i < viewAttributes.length; i++) {
            const obj = viewAttributes[i];
            obj.reslice.setInputData(data);
            obj.renderer.addActor(obj.resliceActor);
            // const widgetState = widget.getWidgetState();
            const reslice = obj.reslice;
            let viewType = ViewTypes.AXIAL;
            if (i === 0) {
                viewType = ViewTypes.CORONAL;
            } else if (i === 1) {
                viewType = ViewTypes.SAGITTAL;
            }

            viewAttributes
                // No need to update plane nor refresh when interaction
                // is on current view. Plane can't be changed with interaction on current
                // view. Refreshs happen automatically with `animation`.
                // Note: Need to refresh also the current view because of adding the mouse wheel
                // to change slicer
                // .filter((_, index) => index !== i)
                .forEach((v) => {
                    // Interactions in other views may change current plane
                    v.widgetInstance.onInteractionEvent(() => {
                        updateReslice(
                            widget,
                            viewType,
                            reslice,
                            obj.resliceActor,
                            obj.renderer
                        );
                    });
                });

            updateReslice(
                widget,
                viewType,
                reslice,
                obj.resliceActor,
                obj.renderer
            );

            // Reset the camera and render image
            obj.renderer.resetCamera();
            obj.renderer.resetCameraClippingRange();
            obj.renderWindow.render();
        }
    });
};

// OPEN VOLUME RENDER IMAGE
document.querySelector("#vrInputFile").onchange = function (e) {
    console.log("====== vrInputFile clicked ======");

    const files = e.target.files;
    if (!files.length) {
        console.warn("cannot find files");
        return;
    }

    readFile(null, files[0]).then(function ({
        image,
        mesh,
        polyData,
        webWorker,
    }) {
        //////////////////// Marching Cube rendering ////////////////////

        // 1. first use ITKHelper to covert ITK image to VTK image
        const data = convertItkToVtkImage(image);

        // 2. Get the data scalar range to set the first ISO value
        const dataRange = data.getPointData().getScalars().getRange();
        const firstIsoValue = (dataRange[0] + dataRange[1]) / 3;

        // 3. Create render window
        //3-1. Create new instance of render window
        const renderWindow = vtkRenderWindow.newInstance();
        const renderWindowContainer = document.querySelector("#vtkPane1");

        // 3-2. Create new instacne of OpenGL render window and set the HTML container
        const glwindow = vtkOpenGLRenderWindow.newInstance();
        glwindow.setContainer(renderWindowContainer); //
        renderWindow.addView(glwindow);

        // 3-3. Create Interactor for giving it mouse event
        let interactor = vtkRenderWindowInteractor.newInstance();
        interactor.setInteractorStyle(
            vtkInteractorStyleTrackballCamera.newInstance()
        );
        interactor.setView(glwindow);
        interactor.initialize();
        interactor.bindEvents(renderWindowContainer);

        // 4. Create renderer and add to render window
        const renderer = vtkRenderer.newInstance();
        renderWindow.addRenderer(renderer);
        renderer.setBackground(0, 0, 0);

        // 5. Create Actor and Mapper
        const actor = vtkActor.newInstance();
        const mapper = vtkMapper.newInstance();
        const marchingCube = vtkImageMarchingCubes.newInstance({
            contourValue: 0.0,
            computeNormals: true,
            mergePoints: true,
        });
        // 5-1. Set Mapper to Actor
        // 5-2. Use Mapper to connect with Vtk Marching Cube
        actor.setMapper(mapper);
        marchingCube.setInputData(data);
        mapper.setInputConnection(marchingCube.getOutputPort());
        marchingCube.setContourValue(firstIsoValue);

        // 6. Render
        // 6-1. Add actor on renderer
        renderer.addActor(actor);
        // 6-2. Set render camera option
        renderer
            .getActiveCamera()
            .set({ position: [1, 1, 0], viewUp: [0, 0, -1] });
        renderer.resetCamera();

        //////////////////// Orientation Cube  ////////////////////

        // 1. Create new Cube(for using orientation of marchingCube data)
        const axes = vtkAnnotatedCubeActor.newInstance();
        // 1-1. Style axes data
        axes.setDefaultStyle({
            fontStyle: "bold",
            fontFamily: "Arial",
            fontColor: "black",
            fontSizeScale: (res) => res / 2,
            faceColor: "#0000ff",
            faceRotation: 0,
            edgeThickness: 0.1,
            edgeColor: "black",
            resolution: 400,
        });

        axes.setXPlusFaceProperty({ text: "L" });
        axes.setXMinusFaceProperty({
            text: "R",
            faceColor: "#ffff00",
            faceRotation: 90,
            fontStyle: "italic",
        });
        axes.setYPlusFaceProperty({
            text: "P",
            faceColor: "#00ff00",
            fontSizeScale: (res) => res / 4,
        });
        axes.setYMinusFaceProperty({
            text: "A",
            faceColor: "#00ffff",
            fontColor: "white",
        });
        axes.setZPlusFaceProperty({
            text: "S",
            edgeColor: "yellow",
        });
        axes.setZMinusFaceProperty({
            text: "I",
            faceRotation: 45,
            edgeThickness: 0,
        });

        // 2. Create Orientation Widget
        const orientationWidget = vtkOrientationMarkerWidget.newInstance({
            actor: axes,
            interactor: renderWindow.getInteractor(),
        });
        // 3. Configure Widget
        orientationWidget.setEnabled(true);
        orientationWidget.setViewportCorner(
            vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
        );
        orientationWidget.setViewportSize(0.15);
        orientationWidget.setMinPixelSize(50);
        orientationWidget.setMaxPixelSize(50);

        // 4. Render the orientation data
        renderWindow.render();
    });
};
